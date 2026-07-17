// server.js — Resuno backend entry point
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const analyzeRoutes = require('./routes/analyze');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Security & core middleware ----------
app.use(
  helmet({
    contentSecurityPolicy: false // relaxed so inline demo styles/scripts in frontend still work
  })
);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic rate limiting on the analysis endpoint to protect the Groq quota
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, message: 'Too many requests. Please try again in a few minutes.' }
});
app.use('/api/analyze', analyzeLimiter);

// ---------- Static frontend ----------
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// ---------- API routes ----------
app.use('/api', analyzeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Resuno API is running.' });
});

// Fallback to index.html for any non-API GET request (simple multi-page app)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// ---------- Error handler (always last) ----------
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n  Resuno server running → http://localhost:${PORT}\n`);
});
