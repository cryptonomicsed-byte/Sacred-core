/**
 * Sacred Core Backend API Server
 * Real auth (SQLite + bcrypt + JWT) backing the frontend's authService.
 *
 * Scope note: campaigns/leads/settings/analytics currently live entirely in
 * the client-side Zustand store (persisted to IndexedDB) — no page in the
 * app calls this server for that data. Auth is the only thing the frontend
 * actually talks to this server for, so that's the only domain implemented
 * here. Don't add fixture endpoints for domains nothing calls.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodeCrypto from 'crypto';
import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({
  logger: true,
  trustProxy: true
});

// Environment
const PORT = parseInt(process.env.API_PORT || '4000', 10);
const HOST = process.env.API_HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'sacred-core.db');

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is required. Set it in .env.local (see .env.example).');
  process.exit(1);
}

/**
 * Database
 */
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    avatar TEXT,
    tier TEXT NOT NULL DEFAULT 'pro',
    credits INTEGER NOT NULL DEFAULT 500,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const cleanupExpiredSessions = () => {
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now') OR revoked_at IS NOT NULL").run();
};
cleanupExpiredSessions();
const sessionCleanupInterval = setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // hourly

const MAX_NAME_LENGTH = 100;
const MAX_AVATAR_LENGTH = 100_000; // ~100KB, enough for a small data-URI avatar
const MAX_PASSWORD_LENGTH = 72; // bcrypt silently truncates beyond this; reject instead of pretending it worked
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const hashToken = (token: string): string =>
  nodeCrypto.createHash('sha256').update(token).digest('hex');

const issueSession = (userId: string): { accessToken: string; refreshToken: string } => {
  const accessToken = app.jwt.sign({ userId }, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = nodeCrypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();

  db.prepare(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(crypto.randomUUID(), userId, hashToken(refreshToken), expiresAt);

  return { accessToken, refreshToken };
};

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  avatar: string | null;
  tier: string;
  credits: number;
  created_at: string;
}

const toPublicUser = (row: UserRow) => ({
  id: row.id,
  email: row.email,
  name: row.name ?? undefined,
  avatar: row.avatar ?? undefined,
  tier: row.tier,
  credits: row.credits,
  createdAt: row.created_at
});

/**
 * Register plugins
 */
await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
});

await app.register(jwt, {
  secret: JWT_SECRET
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes'
});

/**
 * Health Check
 */
app.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

/**
 * Auth Routes
 */
app.post('/api/auth/signup', {
  config: {
    rateLimit: { max: 15, timeWindow: '1 minute' }
  }
}, async (request, reply) => {
  const { email: rawEmail, password, name: rawName } = request.body as { email: string; password: string; name?: string };

  if (!rawEmail || !password) {
    return reply.status(400).send({ success: false, error: 'Email and password required' });
  }
  const email = normalizeEmail(rawEmail);
  if (!EMAIL_RE.test(email)) {
    return reply.status(400).send({ success: false, error: 'Enter a valid email address' });
  }
  if (password.length < 8) {
    return reply.status(400).send({ success: false, error: 'Password must be at least 8 characters' });
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return reply.status(400).send({ success: false, error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer` });
  }
  const name = rawName?.trim().slice(0, MAX_NAME_LENGTH);
  if (rawName !== undefined && rawName.length > MAX_NAME_LENGTH) {
    return reply.status(400).send({ success: false, error: `name must be ${MAX_NAME_LENGTH} characters or fewer` });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return reply.status(409).send({ success: false, error: 'An account with this email already exists' });
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare(
    'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
  ).run(id, email, passwordHash, name || email.split('@')[0]);

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  const user = toPublicUser(row);
  const { accessToken, refreshToken } = issueSession(user.id);

  return { success: true, token: accessToken, refreshToken, user };
});

app.post('/api/auth/login', {
  config: {
    rateLimit: { max: 5, timeWindow: '1 minute' }
  }
}, async (request, reply) => {
  const { email: rawEmail, password } = request.body as { email: string; password: string };

  if (!rawEmail || !password) {
    return reply.status(400).send({ success: false, error: 'Email and password required' });
  }
  const email = normalizeEmail(rawEmail);

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return reply.status(401).send({ success: false, error: 'Invalid email or password' });
  }

  const user = toPublicUser(row);
  const { accessToken, refreshToken } = issueSession(user.id);

  return { success: true, token: accessToken, refreshToken, user };
});

app.post('/api/auth/refresh', {
  config: {
    rateLimit: { max: 20, timeWindow: '1 minute' }
  }
}, async (request, reply) => {
  const { refreshToken } = request.body as { refreshToken?: string };
  if (!refreshToken) {
    return reply.status(400).send({ success: false, error: 'refreshToken required' });
  }

  const tokenHash = hashToken(refreshToken);
  const session = db.prepare(
    'SELECT * FROM sessions WHERE token_hash = ? AND revoked_at IS NULL'
  ).get(tokenHash) as { id: string; user_id: string; expires_at: string } | undefined;

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    return reply.status(401).send({ success: false, error: 'Invalid or expired refresh token' });
  }

  // Rotate: revoke the used refresh token and issue a new pair.
  db.prepare('UPDATE sessions SET revoked_at = datetime(\'now\') WHERE id = ?').run(session.id);
  const { accessToken, refreshToken: newRefreshToken } = issueSession(session.user_id);

  return { success: true, token: accessToken, refreshToken: newRefreshToken };
});

app.post('/api/auth/logout', async (request) => {
  const { refreshToken } = (request.body as { refreshToken?: string } | undefined) || {};
  if (refreshToken) {
    db.prepare('UPDATE sessions SET revoked_at = datetime(\'now\') WHERE token_hash = ?')
      .run(hashToken(refreshToken));
  }
  return { success: true, message: 'Logged out' };
});

app.get('/api/auth/me', async (request, reply) => {
  try {
    const payload = await request.jwtVerify<{ userId: string }>();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as UserRow | undefined;
    if (!row) {
      return reply.status(401).send({ success: false, error: 'User not found' });
    }
    return { success: true, user: toPublicUser(row) };
  } catch {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
});

app.put('/api/auth/me', async (request, reply) => {
  try {
    const payload = await request.jwtVerify<{ userId: string }>();
    const { name, avatar } = request.body as { name?: string; avatar?: string };

    if (name !== undefined && name.length > MAX_NAME_LENGTH) {
      return reply.status(400).send({ success: false, error: `name must be ${MAX_NAME_LENGTH} characters or fewer` });
    }
    if (avatar !== undefined && avatar.length > MAX_AVATAR_LENGTH) {
      return reply.status(400).send({ success: false, error: `avatar must be ${MAX_AVATAR_LENGTH} characters or fewer` });
    }

    db.prepare('UPDATE users SET name = COALESCE(?, name), avatar = COALESCE(?, avatar) WHERE id = ?')
      .run(name ?? null, avatar ?? null, payload.userId);

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as UserRow;
    return { success: true, user: toPublicUser(row) };
  } catch {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
});

/**
 * Error handler
 */
app.setErrorHandler((error: FastifyError, request, reply) => {
  console.error('API Error:', error);

  if (error.statusCode === 400) {
    return reply.status(400).send({ success: false, error: error.message || 'Bad request' });
  }
  if (error.statusCode === 401) {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
  if (error.statusCode === 404) {
    return reply.status(404).send({ success: false, error: 'Not found' });
  }

  return reply.status(500).send({ success: false, error: 'Internal server error' });
});

/**
 * Start server
 */
const start = async () => {
  try {
    await app.listen({ host: HOST, port: PORT });
    console.log(`\n✅ Sacred Core API Server running at http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`💾 Database: ${DB_PATH}`);
    console.log(`🔐 CORS enabled for: ${process.env.CORS_ORIGIN || 'localhost:3001, localhost:3000'}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

const signals = ['SIGINT', 'SIGTERM'];
signals.forEach(signal => {
  process.on(signal, async () => {
    console.log(`\n⏹️  Received ${signal}, shutting down gracefully...`);
    clearInterval(sessionCleanupInterval);
    db.close();
    await app.close();
    process.exit(0);
  });
});

start();
