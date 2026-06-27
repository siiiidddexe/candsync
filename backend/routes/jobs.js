const express = require('express');
const db = require('../db');
const { verifyToken, can, canJobAccess } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

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
