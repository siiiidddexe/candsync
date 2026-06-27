const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { verifyToken, isSuperAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, isSuperAdmin);

const DEFAULT_PERMS = {
  jobs: { create: false, read: true, update: false, delete: false },
  candidates: { create: false, read: true, update: false, delete: false },
  exports: { withResume: false, withoutResume: true },
  resumeAccess: false,
  statuses: { create: false, read: true, update: false, delete: false },
  templates: { create: false, read: true, update: false, delete: false },
  users: { create: false, read: false, update: false, delete: false },
  settings: false,
  jobAccess: 'all'
};

router.get('/', (req, res) => {
  const users = db.prep('SELECT id,name,email,role,permissions,is_active,created_at FROM users ORDER BY created_at DESC').all();
  users.forEach(u => { u.permissions = JSON.parse(u.permissions || '{}'); });
  res.json(users);
});

router.post('/', (req, res) => {
  const { name, email, password, role, permissions } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });
  if (db.prep('SELECT id FROM users WHERE email=?').get(email.toLowerCase())) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const result = db.prep('INSERT INTO users (name,email,password,role,permissions) VALUES (?,?,?,?,?)')
    .run(name, email.toLowerCase(), bcrypt.hashSync(password, 10), role || 'viewer', JSON.stringify(permissions || DEFAULT_PERMS));
  res.status(201).json({ id: Number(result.lastInsertRowid), message: 'User created' });
});

router.get('/:id', (req, res) => {
  const u = db.prep('SELECT id,name,email,role,permissions,is_active,created_at FROM users WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  u.permissions = JSON.parse(u.permissions || '{}');
  res.json(u);
});

router.put('/:id', (req, res) => {
  const { name, email, password, role, permissions, is_active } = req.body;
  const u = db.prep('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  db.prep('UPDATE users SET name=?,email=?,password=?,role=?,permissions=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(
      name || u.name,
      email ? email.toLowerCase() : u.email,
      password ? bcrypt.hashSync(password, 10) : u.password,
      role || u.role,
      JSON.stringify(permissions || JSON.parse(u.permissions || '{}')),
      is_active !== undefined ? (is_active ? 1 : 0) : u.is_active,
      req.params.id
    );
  res.json({ message: 'User updated' });
});

router.delete('/:id', (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prep('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
