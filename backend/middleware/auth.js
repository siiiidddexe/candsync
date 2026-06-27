const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'candsync-secret-key-change-in-prod';

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    const user = db.prep('SELECT id,name,email,role,permissions,is_active FROM users WHERE id=?').get(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid or inactive account' });
    user.permissions = JSON.parse(user.permissions || '{}');
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function isSuperAdmin(req, res, next) {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });
  next();
}

function can(resource, action) {
  return (req, res, next) => {
    if (req.user.role === 'superadmin') return next();
    const perms = req.user.permissions;
    const check = action ? perms[resource] && perms[resource][action] : perms[resource];
    if (!check) return res.status(403).json({ error: 'Permission denied' });
    next();
  };
}

function canJobAccess(req, res, next) {
  if (req.user.role === 'superadmin') return next();
  const jobAccess = req.user.permissions.jobAccess;
  if (!jobAccess) return res.status(403).json({ error: 'No job access' });
  if (jobAccess === 'all') return next();
  const jobId = parseInt(req.params.jobId || req.body.job_id || req.query.job_id);
  if (!jobId || !Array.isArray(jobAccess) || !jobAccess.includes(jobId)) {
    return res.status(403).json({ error: 'No access to this job' });
  }
  next();
}

module.exports = { verifyToken, isSuperAdmin, can, canJobAccess, JWT_SECRET };
