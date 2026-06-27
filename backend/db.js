const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'candsync.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'viewer',
    permissions TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    client TEXT,
    location TEXT,
    skills TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS job_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    access_level TEXT DEFAULT 'view',
    UNIQUE(job_id, user_id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1',
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id TEXT UNIQUE NOT NULL,
    job_id INTEGER NOT NULL,
    date TEXT,
    sub_source TEXT,
    name TEXT NOT NULL,
    skill TEXT,
    mobile TEXT,
    email TEXT,
    dob TEXT,
    qualification TEXT,
    year_of_passing TEXT,
    total_exp TEXT,
    rel_exp TEXT,
    current_org TEXT,
    current_location TEXT,
    preferred_location TEXT,
    rate_per_month TEXT,
    notice_period TEXT,
    status_id INTEGER,
    resume_path TEXT,
    resume_original_name TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES statuses(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Helper: prepare with bigint reading disabled
function prep(sql) {
  const stmt = db.prepare(sql);
  stmt.setReadBigInts(false);
  return stmt;
}

// Seed superadmin
const adminRow = prep('SELECT id FROM users WHERE role = ?').get('superadmin');
if (!adminRow) {
  const hashedPw = bcrypt.hashSync('Admin@123', 10);
  const fullPerms = {
    jobs: { create: true, read: true, update: true, delete: true },
    candidates: { create: true, read: true, update: true, delete: true },
    exports: { withResume: true, withoutResume: true },
    resumeAccess: true,
    statuses: { create: true, read: true, update: true, delete: true },
    users: { create: true, read: true, update: true, delete: true },
    settings: true,
    jobAccess: 'all'
  };
  prep('INSERT INTO users (name,email,password,role,permissions) VALUES (?,?,?,?,?)')
    .run('Super Admin', 'admin@candsync.com', hashedPw, 'superadmin', JSON.stringify(fullPerms));
  console.log('Default superadmin created: admin@candsync.com / Admin@123');
}

// Seed statuses
const statusCount = prep('SELECT COUNT(*) as c FROM statuses').get();
if (!statusCount.c) {
  const ins = prep('INSERT INTO statuses (name,color,order_index) VALUES (?,?,?)');
  [
    ['New', '#6366f1', 0], ['Screening', '#f59e0b', 1], ['Shortlisted', '#10b981', 2],
    ['Interview Scheduled', '#3b82f6', 3], ['Selected', '#22c55e', 4],
    ['Rejected', '#ef4444', 5], ['On Hold', '#94a3b8', 6],
  ].forEach(([n, c, o]) => ins.run(n, c, o));
}

// Seed settings
[
  ['gemini_api_key', ''], ['openrouter_api_key', ''],
  ['openrouter_model', 'google/gemini-2.0-flash-exp:free'], ['ai_provider', 'gemini'],
].forEach(([k, v]) => prep('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').run(k, v));

// Export both raw db and the prep helper
db.prep = prep;
module.exports = db;
