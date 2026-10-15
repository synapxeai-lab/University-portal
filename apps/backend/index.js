const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const routes       = require('./routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
// Vite picks the next free port (5174, 5175, ...) whenever 5173 is already in
// use by something else on the machine, so a fixed allowlist entry silently
// breaks every request the moment that happens. Any localhost/127.0.0.1 origin
// is allowed in addition to the configured FRONTEND_URL — safe here since this
// server isn't exposed outside the local machine during development.
// FRONTEND_URL may hold several comma-separated origins (e.g. the Vercel
// production domain plus a custom domain). ALLOW_VERCEL_PREVIEWS=true also
// lets Vercel preview deployments (*.vercel.app) through.
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim().replace(/\/+$/, '')),
  'http://localhost:3000',
].filter(Boolean);
const isLocalhostOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
const isVercelPreview = (origin) =>
  process.env.ALLOW_VERCEL_PREVIEWS === 'true' && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isLocalhostOrigin(origin) || isVercelPreview(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() })
);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` })
);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
