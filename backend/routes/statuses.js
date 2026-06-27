const express = require('express');
const db = require('../db');
const { verifyToken, can } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res) => {
  res.json(db.prep('SELECT * FROM statuses ORDER BY order_index ASC, name ASC').all());
});

router.post('/', can('statuses', 'create'), (req, res) => {
  const { name, color, order_index } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const r = db.prep('INSERT INTO statuses (name,color,order_index) VALUES (?,?,?)').run(name, color || '#6366f1', order_index || 0);
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch { res.status(400).json({ error: 'Status name already exists' }); }
});

router.put('/:id', can('statuses', 'update'), (req, res) => {
  const { name, color, order_index } = req.body;
  const s = db.prep('SELECT * FROM statuses WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  db.prep('UPDATE statuses SET name=?,color=?,order_index=? WHERE id=?')
    .run(name || s.name, color || s.color, order_index !== undefined ? order_index : s.order_index, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', can('statuses', 'delete'), (req, res) => {
  db.prep('UPDATE candidates SET status_id=NULL WHERE status_id=?').run(req.params.id);
  db.prep('DELETE FROM statuses WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
