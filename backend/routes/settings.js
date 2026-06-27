const express = require('express');
const db = require('../db');
const { verifyToken, isSuperAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, isSuperAdmin);

router.get('/', (req, res) => {
  const rows = db.prep('SELECT key,value FROM settings').all();
  const out = {};
  rows.forEach(r => {
    if (r.key.includes('api_key') && r.value && r.value.length > 6) {
      out[r.key] = '••••••••••••' + r.value.slice(-6);
    } else {
      out[r.key] = r.value;
    }
  });
  out.gemini_key_set = !!(db.prep("SELECT value FROM settings WHERE key='gemini_api_key'").get()?.value);
  out.openrouter_key_set = !!(db.prep("SELECT value FROM settings WHERE key='openrouter_api_key'").get()?.value);
  res.json(out);
});

router.put('/', (req, res) => {
  const allowed = ['gemini_api_key','openrouter_api_key','openrouter_model','gemini_model','ai_provider'];
  const upsert = db.prep('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)');
  allowed.forEach(k => { if (req.body[k] !== undefined) upsert.run(k, req.body[k]); });
  res.json({ message: 'Settings saved' });
});

module.exports = router;
