const express = require('express');
const db = require('../db');
const { verifyToken, can, canJobAccess } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

function getSetting(key) {
  return db.prep('SELECT value FROM settings WHERE key=?').get(key)?.value || '';
}

const JD_PROMPT = `Extract job posting details from this text. Return ONLY a valid JSON object with these exact fields (empty string for missing):
{"title":"","client":"","location":"","skills":"","description":""}
Return ONLY the JSON object, no other text.`;

async function callGeminiText(text, apiKey, model) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${JD_PROMPT}\n\nJob Description Text:\n${text}` }] }],
      generationConfig: { temperature: 0.1 }
    })
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in response');
  return JSON.parse(m[0]);
}

async function callOpenRouterText(text, apiKey, model) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://hiperboard.app', 'X-Title': 'Hiperboard Resdex' },
    body: JSON.stringify({
      model: model || 'google/gemini-2.5-flash-preview:free',
      messages: [{ role: 'user', content: `${JD_PROMPT}\n\nJob Description Text:\n${text}` }]
    })
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const txt = data.choices?.[0]?.message?.content || '';
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in response');
  return JSON.parse(m[0]);
}

// AI extract from pasted JD text
router.post('/extract-text', can('jobs', 'create'), async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  const aiProvider = getSetting('ai_provider') || 'gemini';
  const geminiKey = getSetting('gemini_api_key');
  const geminiModel = getSetting('gemini_model') || 'gemini-2.5-flash-preview-05-20';
  const orKey = getSetting('openrouter_api_key');
  const orModel = getSetting('openrouter_model');

  let extracted = {}, provider = '';
  const tryGemini = async () => { extracted = await callGeminiText(text, geminiKey, geminiModel); provider = 'Gemini'; };
  const tryOR    = async () => { extracted = await callOpenRouterText(text, orKey, orModel); provider = 'OpenRouter'; };

  try {
    if (aiProvider === 'gemini' && geminiKey) await tryGemini();
    else if (orKey) await tryOR();
    else if (geminiKey) await tryGemini();
    else return res.status(400).json({ error: 'No AI API key configured. Add one in Settings.' });
  } catch (err) {
    try {
      if (provider !== 'OpenRouter' && orKey) await tryOR();
      else if (provider !== 'Gemini' && geminiKey) await tryGemini();
      else return res.status(500).json({ error: `AI extraction failed: ${err.message}` });
    } catch (err2) {
      return res.status(500).json({ error: `AI extraction failed: ${err2.message}` });
    }
  }

  res.json({ extracted, provider });
});

function getAccessibleJobIds(user) {
  if (user.role === 'superadmin') return null;
  const ja = user.permissions.jobAccess;
  if (!ja || ja === 'all') return null;
  return Array.isArray(ja) ? ja : [];
}

router.get('/', can('jobs', 'read'), (req, res) => {
  const ids = getAccessibleJobIds(req.user);
  let jobs;
  const base = `
    SELECT j.*, u.name as created_by_name, t.name as template_name, t.columns as template_columns,
      (SELECT COUNT(*) FROM candidates c WHERE c.job_id = j.id) as candidate_count
    FROM jobs j
    LEFT JOIN users u ON j.created_by = u.id
    LEFT JOIN header_templates t ON j.template_id = t.id
  `;
  if (ids === null) {
    jobs = db.prep(base + ' ORDER BY j.created_at DESC').all();
  } else if (ids.length === 0) {
    jobs = [];
  } else {
    const ph = ids.map(() => '?').join(',');
    jobs = db.prep(base + ` WHERE j.id IN (${ph}) ORDER BY j.created_at DESC`).all(...ids);
  }
  res.json(jobs);
});

router.post('/', can('jobs', 'create'), (req, res) => {
  const { title, client, location, skills, description, status, template_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const r = db.prep('INSERT INTO jobs (title,client,location,skills,description,status,template_id,created_by) VALUES (?,?,?,?,?,?,?,?)')
    .run(title, client || null, location || null, skills || null, description || null, status || 'active', template_id || null, req.user.id);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.get('/:id', can('jobs', 'read'), canJobAccess, (req, res) => {
  const job = db.prep(`
    SELECT j.*, u.name as created_by_name, t.name as template_name, t.columns as template_columns
    FROM jobs j LEFT JOIN users u ON j.created_by=u.id
    LEFT JOIN header_templates t ON j.template_id=t.id
    WHERE j.id=?
  `).get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

router.put('/:id', can('jobs', 'update'), canJobAccess, (req, res) => {
  const { title, client, location, skills, description, status } = req.body;
  const job = db.prep('SELECT * FROM jobs WHERE id=?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  // template_id is immutable once set
  db.prep('UPDATE jobs SET title=?,client=?,location=?,skills=?,description=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(title || job.title, client ?? job.client, location ?? job.location, skills ?? job.skills, description ?? job.description, status || job.status, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', can('jobs', 'delete'), (req, res) => {
  db.prep('DELETE FROM jobs WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
