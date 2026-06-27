require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check (used by Docker HEALTHCHECK + load balancers)
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/statuses', require('./routes/statuses'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/users', require('./routes/users'));

// Serve compiled frontend in production (single-container deployment)
if (IS_PROD) {
  const PUBLIC = path.join(__dirname, 'public');
  app.use(express.static(PUBLIC));
  // SPA fallback – send index.html for any non-API route
  app.get('*', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(`CandSync backend running on http://0.0.0.0:${PORT} [${IS_PROD ? 'production' : 'development'}]`)
);
