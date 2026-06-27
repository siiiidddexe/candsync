const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prep('SELECT * FROM users WHERE email=? AND is_active=1').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...userSafe } = user;
  userSafe.permissions = JSON.parse(userSafe.permissions || '{}');
  res.json({ token, user: userSafe });
});

router.get('/me', verifyToken, (req, res) => res.json(req.user));

router.put('/me/password', verifyToken, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 6) return res.status(400).json({ error: 'Min 6 characters' });
  const user = db.prep('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password)) return res.status(400).json({ error: 'Wrong password' });
  db.prep('UPDATE users SET password=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(bcrypt.hashSync(new_password, 10), req.user.id);
  res.json({ message: 'Password updated' });
});

module.exports = router;
