const express = require('express');
const db = require('../db');
const { verifyToken, can } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

// Map common column label variants → DB field key
const STANDARD_MAP = {
  'date': 'date',
  'sub source': 'sub_source', 'sub_source': 'sub_source',
  'candidate name': 'name', 'name': 'name',
  'skill': 'skill', 'skills': 'skill',
  'mobile no': 'mobile', 'mobile': 'mobile', 'phone': 'mobile', 'contact no': 'mobile',
  'email id': 'email', 'email': 'email',
  'date of birth': 'dob', 'dob': 'dob', 'birth date': 'dob',
  'qualification': 'qualification', 'education': 'qualification',
  'year of passing': 'year_of_passing', 'passing year': 'year_of_passing',
  'total exp': 'total_exp', 'total experience': 'total_exp',
  'rel exp': 'rel_exp', 'relevant exp': 'rel_exp', 'relevant experience': 'rel_exp',
  'current organization': 'current_org', 'current org': 'current_org', 'company': 'current_org', 'employer': 'current_org',
  'current location': 'current_location', 'location': 'current_location',
  'preferred location': 'preferred_location',
  'rate per month': 'rate_per_month', 'ctc': 'rate_per_month', 'salary': 'rate_per_month',
  'notice period': 'notice_period',
};

function resolveColumns(csvString) {
  return csvString
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(label => {
      const stdKey = STANDARD_MAP[label.toLowerCase()];
      const key = stdKey || ('custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
      return { label, key };
    });
}

router.get('/', (req, res) => {
  const list = db.prep('SELECT * FROM header_templates ORDER BY created_at ASC').all();
  list.forEach(t => { t.columns = JSON.parse(t.columns || '[]'); });
  res.json(list);
});

router.post('/', can('templates', 'create'), (req, res) => {
  const { name, columns_csv } = req.body;
  if (!name?.trim() || !columns_csv?.trim()) return res.status(400).json({ error: 'Name and columns required' });
  const cols = resolveColumns(columns_csv);
  if (!cols.length) return res.status(400).json({ error: 'At least one column required' });
  try {
    const r = db.prep('INSERT INTO header_templates (name, columns) VALUES (?, ?)').run(name.trim(), JSON.stringify(cols));
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch {
    res.status(400).json({ error: 'Template name already exists' });
  }
});

router.get('/:id', (req, res) => {
  const t = db.prep('SELECT * FROM header_templates WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  t.columns = JSON.parse(t.columns || '[]');
  res.json(t);
});

router.put('/:id', can('templates', 'update'), (req, res) => {
  const t = db.prep('SELECT * FROM header_templates WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const inUse = db.prep('SELECT COUNT(*) as c FROM jobs WHERE template_id=?').get(req.params.id);
  if (inUse.c > 0) return res.status(400).json({ error: `Template is used by ${inUse.c} job(s) and cannot be edited. Delete those jobs first.` });
  const { name, columns_csv } = req.body;
  const cols = columns_csv ? resolveColumns(columns_csv) : JSON.parse(t.columns);
  db.prep('UPDATE header_templates SET name=?, columns=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name?.trim() || t.name, JSON.stringify(cols), req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', can('templates', 'delete'), (req, res) => {
  const inUse = db.prep('SELECT COUNT(*) as c FROM jobs WHERE template_id=?').get(req.params.id);
  if (inUse.c > 0) return res.status(400).json({ error: `Template is used by ${inUse.c} job(s) and cannot be deleted.` });
  db.prep('DELETE FROM header_templates WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
module.exports.resolveColumns = resolveColumns;
