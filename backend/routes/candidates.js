const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const db = require('../db');
const { verifyToken, can, canJobAccess } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf','.jpg','.jpeg','.png','.gif','.webp'];
    if (ok.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF and images allowed'));
  }
});

function genCandidateId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `CS-${yy}${mm}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function getSetting(key) {
  return db.prep('SELECT value FROM settings WHERE key=?').get(key)?.value || '';
}

const EXTRACT_PROMPT = `Extract candidate information from this resume. Return ONLY a valid JSON object with these exact fields (use empty string "" for missing fields):
{"name":"","skill":"","mobile":"","email":"","dob":"","qualification":"","year_of_passing":"","total_exp":"","rel_exp":"","current_org":"","current_location":"","preferred_location":"","rate_per_month":"","notice_period":""}
Return ONLY the JSON, no other text.`;

async function extractWithGemini(filePath, mimeType, apiKey) {
  const { default: fetch } = await import('node-fetch');
  const base64 = fs.readFileSync(filePath).toString('base64');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: EXTRACT_PROMPT }] }],
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

async function extractWithOpenRouter(filePath, mimeType, apiKey, model) {
  const { default: fetch } = await import('node-fetch');
  const base64 = fs.readFileSync(filePath).toString('base64');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://candsync.app',
      'X-Title': 'CandSync'
    },
    body: JSON.stringify({
      model: model || 'google/gemini-2.0-flash-exp:free',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: EXTRACT_PROMPT }
        ]
      }]
    })
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in response');
  return JSON.parse(m[0]);
}

// AI extract — upload file and extract fields
router.post('/extract', can('candidates', 'create'), upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const mimeType = req.file.mimetype;
  const aiProvider = getSetting('ai_provider') || 'gemini';
  const geminiKey = getSetting('gemini_api_key');
  const orKey = getSetting('openrouter_api_key');
  const orModel = getSetting('openrouter_model');

  let extracted = {}, provider = '';
  try {
    if (aiProvider === 'gemini' && geminiKey) {
      extracted = await extractWithGemini(req.file.path, mimeType, geminiKey);
      provider = 'Gemini';
    } else if (orKey) {
      extracted = await extractWithOpenRouter(req.file.path, mimeType, orKey, orModel);
      provider = 'OpenRouter';
    } else if (geminiKey) {
      extracted = await extractWithGemini(req.file.path, mimeType, geminiKey);
      provider = 'Gemini';
    } else {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'No AI API key configured. Add one in Settings.' });
    }
  } catch (err) {
    // Try fallback
    const usedGemini = provider === 'Gemini' || (aiProvider === 'gemini' && geminiKey);
    if (usedGemini && orKey) {
      try {
        extracted = await extractWithOpenRouter(req.file.path, mimeType, orKey, orModel);
        provider = 'OpenRouter (fallback)';
      } catch (err2) {
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: `Extraction failed: ${err2.message}` });
      }
    } else if (!usedGemini && geminiKey) {
      try {
        extracted = await extractWithGemini(req.file.path, mimeType, geminiKey);
        provider = 'Gemini (fallback)';
      } catch (err2) {
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: `Extraction failed: ${err2.message}` });
      }
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: `Extraction failed: ${err.message}` });
    }
  }

  res.json({ extracted, file: req.file.filename, originalName: req.file.originalname, provider });
});

// Secure resume serving
router.get('/resume/:filename', (req, res) => {
  if (req.user.role !== 'superadmin' && !req.user.permissions?.resumeAccess) {
    return res.status(403).json({ error: 'No resume access' });
  }
  const fp = path.join(UPLOADS_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(fp);
});

// Excel export
router.get('/export/:jobId', canJobAccess, (req, res) => {
  const withResume = req.query.withResume === '1';
  const isSA = req.user.role === 'superadmin';
  const exports = req.user.permissions?.exports || {};
  if (withResume && !isSA && !exports.withResume) return res.status(403).json({ error: 'No permission' });
  if (!withResume && !isSA && !exports.withoutResume) return res.status(403).json({ error: 'No permission' });

  const job = db.prep('SELECT * FROM jobs WHERE id=?').get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const rows = db.prep(`
    SELECT c.*, s.name as status_name FROM candidates c
    LEFT JOIN statuses s ON c.status_id = s.id
    WHERE c.job_id=? ORDER BY c.created_at ASC
  `).all(req.params.jobId);

  const headers = ['Date','Sub Source','Candidate Name','Candidate ID','Skill','Mobile No',
    'Email Id','Date of Birth','Qualification','Year of Passing','Total Exp','Rel Exp',
    'Current Organization','Current Location','Preferred Location','Rate per Month','Notice Period','Status'];
  if (withResume && (isSA || exports.withResume)) headers.push('Resume Link');

  const data = rows.map(c => {
    const row = [c.date,c.sub_source,c.name,c.candidate_id,c.skill,c.mobile,c.email,c.dob,
      c.qualification,c.year_of_passing,c.total_exp,c.rel_exp,c.current_org,
      c.current_location,c.preferred_location,c.rate_per_month,c.notice_period,c.status_name];
    if (withResume && (isSA || exports.withResume)) {
      row.push(c.resume_path ? `/api/candidates/resume/${c.resume_path}` : '');
    }
    return row;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fname = `${(job.title || 'export').replace(/[^a-zA-Z0-9]/g, '_')}_${withResume ? 'with_resume' : 'no_resume'}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// List for job
router.get('/job/:jobId', can('candidates', 'read'), canJobAccess, (req, res) => {
  const list = db.prep(`
    SELECT c.*, s.name as status_name, s.color as status_color, u.name as created_by_name
    FROM candidates c
    LEFT JOIN statuses s ON c.status_id = s.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.job_id = ? ORDER BY c.created_at DESC
  `).all(req.params.jobId);

  const hasResumeAccess = req.user.role === 'superadmin' || req.user.permissions?.resumeAccess;
  if (!hasResumeAccess) list.forEach(c => { c.resume_path = null; });
  res.json(list);
});

// Create
router.post('/', can('candidates', 'create'), (req, res) => {
  const { job_id, name } = req.body;
  if (!job_id || !name) return res.status(400).json({ error: 'job_id and name required' });

  let candidateId, attempts = 0;
  do { candidateId = genCandidateId(); attempts++; }
  while (db.prep('SELECT id FROM candidates WHERE candidate_id=?').get(candidateId) && attempts < 10);

  const r = db.prep(`INSERT INTO candidates (
    candidate_id,job_id,date,sub_source,name,skill,mobile,email,dob,
    qualification,year_of_passing,total_exp,rel_exp,current_org,
    current_location,preferred_location,rate_per_month,notice_period,
    status_id,resume_path,resume_original_name,created_by
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      candidateId, job_id,
      req.body.date || new Date().toISOString().slice(0, 10),
      req.body.sub_source || null, name,
      req.body.skill || null, req.body.mobile || null, req.body.email || null,
      req.body.dob || null, req.body.qualification || null, req.body.year_of_passing || null,
      req.body.total_exp || null, req.body.rel_exp || null, req.body.current_org || null,
      req.body.current_location || null, req.body.preferred_location || null,
      req.body.rate_per_month || null, req.body.notice_period || null,
      req.body.status_id || null,
      req.body.resume_path || null, req.body.resume_original_name || null,
      req.user.id
    );
  res.status(201).json({ id: Number(r.lastInsertRowid), candidate_id: candidateId });
});

// Update
router.put('/:id', can('candidates', 'update'), (req, res) => {
  const c = db.prep('SELECT * FROM candidates WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  const f = ['date','sub_source','name','skill','mobile','email','dob','qualification',
    'year_of_passing','total_exp','rel_exp','current_org','current_location',
    'preferred_location','rate_per_month','notice_period','status_id','resume_path','resume_original_name'];
  const v = f.map(k => req.body[k] !== undefined ? (req.body[k] || null) : c[k]);

  db.prep(`UPDATE candidates SET
    date=?,sub_source=?,name=?,skill=?,mobile=?,email=?,dob=?,
    qualification=?,year_of_passing=?,total_exp=?,rel_exp=?,current_org=?,
    current_location=?,preferred_location=?,rate_per_month=?,notice_period=?,
    status_id=?,resume_path=?,resume_original_name=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=?`).run(...v, req.params.id);
  res.json({ message: 'Updated' });
});

// Delete
router.delete('/:id', can('candidates', 'delete'), (req, res) => {
  const c = db.prep('SELECT * FROM candidates WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (c.resume_path) {
    const fp = path.join(UPLOADS_DIR, c.resume_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  db.prep('DELETE FROM candidates WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
