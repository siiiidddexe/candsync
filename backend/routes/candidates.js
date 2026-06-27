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
  return `CS-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}

function getSetting(key) {
  return db.prep('SELECT value FROM settings WHERE key=?').get(key)?.value || '';
}

// Standard DB keys — everything else goes into custom_fields
const STANDARD_DB_KEYS = new Set(['date','sub_source','name','skill','mobile','email','dob',
  'qualification','year_of_passing','total_exp','rel_exp','current_org',
  'current_location','preferred_location','rate_per_month','notice_period']);

function buildExtractPrompt(columns) {
  // Build JSON template from column labels
  const fields = columns.filter(c => c.key !== 'candidate_id').map(c => `"${c.label}":""`).join(',');
  return `Extract candidate information from this resume. Return ONLY a valid JSON object with EXACTLY these fields (use empty string for missing data):
{${fields}}
Return ONLY the JSON, no other text.`;
}

async function callGemini(filePath, mimeType, apiKey, model, prompt) {
  const { default: fetch } = await import('node-fetch');
  const base64 = fs.readFileSync(filePath).toString('base64');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: prompt }] }],
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

async function callOpenRouter(filePath, mimeType, apiKey, model, prompt) {
  const { default: fetch } = await import('node-fetch');
  const base64 = fs.readFileSync(filePath).toString('base64');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://hiperboard.app', 'X-Title': 'Hiperboard Resdex' },
    body: JSON.stringify({
      model: model || 'google/gemini-2.5-flash-preview:free',
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        { type: 'text', text: prompt }
      ]}]
    })
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const txt = data.choices?.[0]?.message?.content || '';
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in response');
  return JSON.parse(m[0]);
}

// Parse AI response into standard fields + custom_fields
function parseExtraction(rawResult, columns) {
  const standard = {};
  const custom = {};
  columns.forEach(col => {
    const val = rawResult[col.label] || '';
    if (STANDARD_DB_KEYS.has(col.key)) {
      standard[col.key] = val;
    } else {
      custom[col.key] = val;
    }
  });
  return { standard, custom };
}

// AI extract from resume file
router.post('/extract', can('candidates', 'create'), upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Get template columns from request (job's template)
  let columns;
  try {
    columns = req.body.columns ? JSON.parse(req.body.columns) : null;
  } catch { columns = null; }

  // If no template columns provided, use default 16 fields
  if (!columns || !columns.length) {
    columns = [
      { label: 'Candidate Name', key: 'name' }, { label: 'Skill', key: 'skill' },
      { label: 'Mobile No', key: 'mobile' }, { label: 'Email Id', key: 'email' },
      { label: 'Date of Birth', key: 'dob' }, { label: 'Qualification', key: 'qualification' },
      { label: 'Year of Passing', key: 'year_of_passing' }, { label: 'Total Exp', key: 'total_exp' },
      { label: 'Rel Exp', key: 'rel_exp' }, { label: 'Current Organization', key: 'current_org' },
      { label: 'Current Location', key: 'current_location' }, { label: 'Preferred Location', key: 'preferred_location' },
      { label: 'Rate per Month', key: 'rate_per_month' }, { label: 'Notice Period', key: 'notice_period' },
    ];
  }

  const prompt = buildExtractPrompt(columns);
  const mimeType = req.file.mimetype;
  const aiProvider = getSetting('ai_provider') || 'gemini';
  const geminiKey = getSetting('gemini_api_key');
  const geminiModel = getSetting('gemini_model') || 'gemini-2.5-flash-preview-05-20';
  const orKey = getSetting('openrouter_api_key');
  const orModel = getSetting('openrouter_model');

  let rawResult = {}, provider = '';
  const cleanup = () => { try { fs.unlinkSync(req.file.path); } catch {} };

  const tryG = async () => { rawResult = await callGemini(req.file.path, mimeType, geminiKey, geminiModel, prompt); provider = 'Gemini'; };
  const tryOR = async () => { rawResult = await callOpenRouter(req.file.path, mimeType, orKey, orModel, prompt); provider = 'OpenRouter'; };

  try {
    if (aiProvider === 'gemini' && geminiKey) await tryG();
    else if (orKey) await tryOR();
    else if (geminiKey) await tryG();
    else { cleanup(); return res.status(400).json({ error: 'No AI API key configured. Add one in Settings.' }); }
  } catch (err) {
    try {
      if (provider !== 'OpenRouter' && orKey) await tryOR();
      else if (provider !== 'Gemini' && geminiKey) await tryG();
      else { cleanup(); return res.status(500).json({ error: `Extraction failed: ${err.message}` }); }
    } catch (err2) {
      cleanup(); return res.status(500).json({ error: `Extraction failed: ${err2.message}` });
    }
  }

  const { standard, custom } = parseExtraction(rawResult, columns);
  res.json({
    standard,
    custom,
    file: req.file.filename,
    originalName: req.file.originalname,
    provider
  });
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

// Excel export — uses template columns from the job
router.get('/export/:jobId', canJobAccess, (req, res) => {
  const withResume = req.query.withResume === '1';
  const isSA = req.user.role === 'superadmin';
  const exports = req.user.permissions?.exports || {};
  if (withResume && !isSA && !exports.withResume) return res.status(403).json({ error: 'No permission' });
  if (!withResume && !isSA && !exports.withoutResume) return res.status(403).json({ error: 'No permission' });

  const job = db.prep('SELECT j.*, t.columns as template_columns FROM jobs j LEFT JOIN header_templates t ON j.template_id=t.id WHERE j.id=?').get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Determine columns: template columns or default 17
  let columns;
  if (job.template_columns) {
    try { columns = JSON.parse(job.template_columns); } catch { columns = null; }
  }
  if (!columns) {
    columns = [
      { label: 'Date', key: 'date' }, { label: 'Sub source', key: 'sub_source' },
      { label: 'Candidate Name', key: 'name' }, { label: 'Skill', key: 'skill' },
      { label: 'Mobile No', key: 'mobile' }, { label: 'Email Id', key: 'email' },
      { label: 'Date of Birth', key: 'dob' }, { label: 'Qualification', key: 'qualification' },
      { label: 'Year of Passing', key: 'year_of_passing' }, { label: 'Total Exp', key: 'total_exp' },
      { label: 'Rel Exp', key: 'rel_exp' }, { label: 'Current Organization', key: 'current_org' },
      { label: 'Current Location', key: 'current_location' }, { label: 'Preferred Location', key: 'preferred_location' },
      { label: 'Rate per Month', key: 'rate_per_month' }, { label: 'Notice Period', key: 'notice_period' },
    ];
  }

  const rows = db.prep('SELECT * FROM candidates WHERE job_id=? ORDER BY created_at ASC').all(req.params.jobId);

  // Always prepend Candidate ID column to export
  const allCols = [{ label: 'Candidate ID', key: 'candidate_id' }, ...columns];
  const headers = allCols.map(c => c.label);
  if (withResume && (isSA || exports.withResume)) headers.push('Resume link');

  const data = rows.map(c => {
    const custom = JSON.parse(c.custom_fields || '{}');
    const row = allCols.map(col => {
      if (STANDARD_DB_KEYS.has(col.key) || col.key === 'candidate_id') return c[col.key] || '';
      return custom[col.key] || '';
    });
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

// List candidates for a job
router.get('/job/:jobId', can('candidates', 'read'), canJobAccess, (req, res) => {
  const list = db.prep(`
    SELECT c.*, s.name as status_name, s.color as status_color, u.name as created_by_name
    FROM candidates c
    LEFT JOIN statuses s ON c.status_id = s.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.job_id = ? ORDER BY c.created_at DESC
  `).all(req.params.jobId);

  const hasResumeAccess = req.user.role === 'superadmin' || req.user.permissions?.resumeAccess;
  list.forEach(c => {
    c.custom_fields = JSON.parse(c.custom_fields || '{}');
    if (!hasResumeAccess) c.resume_path = null;
  });
  res.json(list);
});

// Create
router.post('/', can('candidates', 'create'), (req, res) => {
  const { job_id, name } = req.body;
  if (!job_id || !name) return res.status(400).json({ error: 'job_id and name required' });

  let cid, tries = 0;
  do { cid = genCandidateId(); tries++; }
  while (db.prep('SELECT id FROM candidates WHERE candidate_id=?').get(cid) && tries < 10);

  const r = db.prep(`INSERT INTO candidates (
    candidate_id,job_id,date,sub_source,name,skill,mobile,email,dob,
    qualification,year_of_passing,total_exp,rel_exp,current_org,
    current_location,preferred_location,rate_per_month,notice_period,
    custom_fields,status_id,resume_path,resume_original_name,created_by
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      cid, job_id,
      req.body.date || new Date().toISOString().slice(0,10),
      req.body.sub_source||null, name,
      req.body.skill||null, req.body.mobile||null, req.body.email||null,
      req.body.dob||null, req.body.qualification||null, req.body.year_of_passing||null,
      req.body.total_exp||null, req.body.rel_exp||null, req.body.current_org||null,
      req.body.current_location||null, req.body.preferred_location||null,
      req.body.rate_per_month||null, req.body.notice_period||null,
      JSON.stringify(req.body.custom_fields || {}),
      req.body.status_id||null,
      req.body.resume_path||null, req.body.resume_original_name||null,
      req.user.id
    );
  res.status(201).json({ id: Number(r.lastInsertRowid), candidate_id: cid });
});

// Update
router.put('/:id', can('candidates', 'update'), (req, res) => {
  const c = db.prep('SELECT * FROM candidates WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  const stdFields = ['date','sub_source','name','skill','mobile','email','dob','qualification',
    'year_of_passing','total_exp','rel_exp','current_org','current_location',
    'preferred_location','rate_per_month','notice_period','status_id','resume_path','resume_original_name'];

  const vals = stdFields.map(k => req.body[k] !== undefined ? (req.body[k]||null) : c[k]);
  const customFields = req.body.custom_fields !== undefined
    ? JSON.stringify(req.body.custom_fields)
    : c.custom_fields;

  db.prep(`UPDATE candidates SET
    date=?,sub_source=?,name=?,skill=?,mobile=?,email=?,dob=?,
    qualification=?,year_of_passing=?,total_exp=?,rel_exp=?,current_org=?,
    current_location=?,preferred_location=?,rate_per_month=?,notice_period=?,
    status_id=?,resume_path=?,resume_original_name=?,
    custom_fields=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=?`).run(...vals, customFields, req.params.id);
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
