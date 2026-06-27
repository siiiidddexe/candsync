const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { verifyToken, can, canJobAccess } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

// Temp storage for JD file uploads (extract then discard)
const tmpDir = path.join(__dirname, '../uploads/tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const jdUpload = multer({
  storage: multer.diskStorage({
    destination: tmpDir,
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf','.jpg','.jpeg','.png','.gif','.webp'];
    if (ok.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF and images allowed'));
  }
});

function getSetting(key) {
  return db.prep('SELECT value FROM settings WHERE key=?').get(key)?.value || '';
}

const JD_PROMPT = `Extract job details from this document. Return ONLY a valid JSON object with these exact fields (empty string for missing):
{"title":"","client":"","location":"","skills":"","description":""}
Return ONLY the JSON, no other text.`;

async function callGemini(filePath, mimeType, apiKey, model) {
  const { default: fetch } = await import('node-fetch');
  const base64 = fs.readFileSync(filePath).toString('base64');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: JD_PROMPT }] }],
      generationConfig: { temperature: 0.1 }
    })
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in response');
  return JSON.parse(m[0]);
}

async function callOpenRouter(filePath, mimeType, apiKey, model) {
  const { default: fetch } = await import('node-fetch');
  const base64 = fs.readFileSync(filePath).toString('base64');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://candsync.app', 'X-Title': 'CandSync' },
    body: JSON.stringify({
      model: model || 'google/gemini-2.0-flash-exp:free',
      messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }, { type: 'text', text: JD_PROMPT }] }]
    })
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in response');
  return JSON.parse(m[0]);
}

// AI extract JD
router.post('/extract', can('jobs', 'create'), jdUpload.single('jd'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const cleanup = () => { try { fs.unlinkSync(req.file.path); } catch {} };

  const mimeType = req.file.mimetype;
  const aiProvider = getSetting('ai_provider') || 'gemini';
  const geminiKey = getSetting('gemini_api_key');
  const geminiModel = getSetting('gemini_model') || 'gemini-2.0-flash';
  const orKey = getSetting('openrouter_api_key');
  const orModel = getSetting('openrouter_model');

  let extracted = {}, provider = '';
  try {
    if (aiProvider === 'gemini' && geminiKey) {
      extracted = await callGemini(req.file.path, mimeType, geminiKey, geminiModel);
      provider = 'Gemini';
    } else if (orKey) {
      extracted = await callOpenRouter(req.file.path, mimeType, orKey, orModel);
      provider = 'OpenRouter';
    } else if (geminiKey) {
      extracted = await callGemini(req.file.path, mimeType, geminiKey, geminiModel);
      provider = 'Gemini';
    } else {
      cleanup();
      return res.status(400).json({ error: 'No AI API key configured. Add one in Settings.' });
    }
  } catch (err) {
    const usedGemini = (aiProvider === 'gemini' && geminiKey);
    try {
      if (usedGemini && orKey) {
        extracted = await callOpenRouter(req.file.path, mimeType, orKey, orModel);
        provider = 'OpenRouter (fallback)';
      } else if (!usedGemini && geminiKey) {
        extracted = await callGemini(req.file.path, mimeType, geminiKey, geminiModel);
        provider = 'Gemini (fallback)';
      } else {
        cleanup();
        return res.status(500).json({ error: `AI extraction failed: ${err.message}` });
      }
    } catch (err2) {
      cleanup();
      return res.status(500).json({ error: `AI extraction failed: ${err2.message}` });
    }
  }

  cleanup();
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
  if (ids === null) {
    jobs = db.prep(`
      SELECT j.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM candidates c WHERE c.job_id = j.id) as candidate_count
      FROM jobs j LEFT JOIN users u ON j.created_by = u.id
      ORDER BY j.created_at DESC
    `).all();
  } else if (ids.length === 0) {
    jobs = [];
  } else {
    const ph = ids.map(() => '?').join(',');
    jobs = db.prep(`
      SELECT j.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM candidates c WHERE c.job_id = j.id) as candidate_count
      FROM jobs j LEFT JOIN users u ON j.created_by = u.id
      WHERE j.id IN (${ph})
      ORDER BY j.created_at DESC
    `).all(...ids);
  }
  res.json(jobs);
});

router.post('/', can('jobs', 'create'), (req, res) => {
  const { title, client, location, skills, description, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const result = db.prep('INSERT INTO jobs (title,client,location,skills,description,status,created_by) VALUES (?,?,?,?,?,?,?)')
    .run(title, client || null, location || null, skills || null, description || null, status || 'active', req.user.id);
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

router.get('/:id', can('jobs', 'read'), canJobAccess, (req, res) => {
  const job = db.prep('SELECT j.*, u.name as created_by_name FROM jobs j LEFT JOIN users u ON j.created_by=u.id WHERE j.id=?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

router.put('/:id', can('jobs', 'update'), canJobAccess, (req, res) => {
  const { title, client, location, skills, description, status } = req.body;
  const job = db.prep('SELECT * FROM jobs WHERE id=?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  db.prep('UPDATE jobs SET title=?,client=?,location=?,skills=?,description=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(title || job.title, client ?? job.client, location ?? job.location, skills ?? job.skills, description ?? job.description, status || job.status, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', can('jobs', 'delete'), (req, res) => {
  db.prep('DELETE FROM jobs WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
