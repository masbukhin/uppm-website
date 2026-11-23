import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createMysqlStore } from './mysql.mjs';
import { normalizePost } from './public-posts.mjs';
import { findVerifiedDocument } from './document-verification.mjs';
import { filterSnapshotForUser, mergeSnapshotForUser } from './access.mjs';
import { turnstileEnabled, verifyTurnstileToken } from './turnstile.mjs';
import {
  clearLoginFailures, clearSessionCookie, createSessionToken, hashPassword, initSessionSecret, isLoginBlocked,
  passwordVersion, publicAccount, readCookie, readSessionToken, recordLoginFailure, setSessionCookie,
  validateNewPassword, verifyPassword,
} from './auth.mjs';

dotenv.config({ path: '.env.local', override: false });

const app = express();
const port = Number(process.env.PORT || 4100);
const sintaCache = new Map();
const SINTA_CACHE_TTL = 5 * 60 * 1000;

// Behind Caddy/Nginx/Docker networks: trust private-network proxies for req.ip and req.secure.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');
app.disable('x-powered-by');

app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '25mb' }));

// CSRF guard: state-changing API calls must be JSON (cross-site forms cannot send that without CORS).
app.use('/api', (request, response, next) => {
  // request.is() returns null when there is no body (e.g. DELETE), false for a non-JSON body.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.is('application/json') === false) {
    return response.status(415).json({ ok: false, error: 'Content-Type harus application/json.' });
  }
  next();
});

let store;
try {
  initSessionSecret();
  store = await createMysqlStore();
} catch (error) {
  console.error('Backend tidak dapat diinisialisasi:', error.message);
  console.error('Periksa MYSQL_* dan SESSION_SECRET di .env / .env.local.');
  process.exit(1);
}

// ---------- Auth helpers ----------

async function sessionUser(request) {
  const session = readSessionToken(readCookie(request));
  if (!session) return null;
  const account = await store.getAccountById(session.sub);
  if (!account || account.role !== session.role || passwordVersion(account.password) !== session.pv) return null;
  return account;
}

function requireAuth(role) {
  return async (request, response, next) => {
    try {
      const user = await sessionUser(request);
      if (!user) return response.status(401).json({ ok: false, error: 'Sesi berakhir. Silakan login kembali.' });
      if (role && user.role !== role) return response.status(403).json({ ok: false, error: 'Akses ditolak.' });
      request.user = user;
      next();
    } catch (error) {
      console.error('Session check failed:', error);
      response.status(503).json({ ok: false, error: 'Database tidak tersedia.' });
    }
  };
}

async function checkHuman(request) {
  if (!turnstileEnabled()) return { ok: true };
  return verifyTurnstileToken(request.body?.turnstileToken, request.ip);
}

function startSession(request, response, account) {
  setSessionCookie(request, response, createSessionToken(account));
  return publicAccount(account);
}

// ---------- Public endpoints ----------

app.get('/api/health', async (_request, response) => {
  try {
    response.json({ ok: true, database: await store.health() });
  } catch (error) {
    response.status(503).json({ ok: false, error: 'Database tidak tersedia.' });
  }
});

app.get('/api/auth/session', async (request, response) => {
  try {
    const [user, hasAdmin] = await Promise.all([sessionUser(request), store.hasAdmin()]);
    response.json({ ok: true, user: publicAccount(user), hasAdmin });
  } catch (error) {
    console.error('Session lookup failed:', error);
    response.status(503).json({ ok: false, error: 'Database MySQL tidak dapat dihubungi.' });
  }
});

app.post('/api/auth/login', async (request, response) => {
  const username = String(request.body?.username || '').trim();
  const password = String(request.body?.password || '');
  const role = request.body?.role;
  if (isLoginBlocked(request.ip, username)) {
    return response.status(429).json({ ok: false, error: 'Terlalu banyak percobaan login. Coba lagi 15 menit lagi.' });
  }
  const human = await checkHuman(request);
  if (!human.ok) return response.status(human.status).json({ ok: false, error: human.error });

  try {
    const account = username ? await store.findAccountByUsername(username) : null;
    if (!account || !verifyPassword(password, account.password)) {
      recordLoginFailure(request.ip, username);
      return response.status(401).json({ ok: false, error: 'Username atau password tidak sesuai.' });
    }
    if (role && account.role !== role) {
      const actualRole = account.role === 'admin' ? 'Admin' : 'Dosen';
      return response.status(400).json({ ok: false, error: `Akun ini terdaftar sebagai ${actualRole}. Pilih login ${actualRole}.` });
    }
    clearLoginFailures(request.ip, username);
    response.json({ ok: true, user: startSession(request, response, account) });
  } catch (error) {
    console.error('Login failed:', error);
    response.status(503).json({ ok: false, error: 'Database tidak tersedia.' });
  }
});

// First-run only: creates the first admin when no admin exists yet.
app.post('/api/auth/setup', async (request, response) => {
  const username = String(request.body?.username || '').trim();
  const password = String(request.body?.password || '');
  const nama = String(request.body?.nama || '').trim() || 'Administrator UPPM';
  if (username.length < 4) return response.status(400).json({ ok: false, error: 'Username admin minimal 4 karakter.' });
  const passwordError = validateNewPassword(password);
  if (passwordError) return response.status(400).json({ ok: false, error: passwordError });
  const human = await checkHuman(request);
  if (!human.ok) return response.status(human.status).json({ ok: false, error: human.error });

  try {
    const account = { id: `admin-${Date.now()}`, username, password: hashPassword(password), role: 'admin', nama };
    await store.createAccount(account, { onlyIfNoAdmin: true });
    response.json({ ok: true, user: startSession(request, response, account) });
  } catch (error) {
    if (error.code === 'ADMIN_EXISTS' || error.code === 'USERNAME_TAKEN') return response.status(409).json({ ok: false, error: error.message });
    console.error('Admin setup failed:', error);
    response.status(503).json({ ok: false, error: 'Database tidak tersedia.' });
  }
});

app.post('/api/auth/logout', (request, response) => {
  clearSessionCookie(request, response);
  response.json({ ok: true });
});

app.post('/api/auth/password', requireAuth(), async (request, response) => {
  const currentPassword = String(request.body?.currentPassword || '');
  const newPassword = String(request.body?.newPassword || '');
  if (!verifyPassword(currentPassword, request.user.password)) {
    return response.status(400).json({ ok: false, error: 'Password lama tidak sesuai.' });
  }
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) return response.status(400).json({ ok: false, error: passwordError });
  try {
    const hash = hashPassword(newPassword);
    await store.setAccountPassword(request.user.id, hash);
    startSession(request, response, { ...request.user, password: hash });
    response.json({ ok: true });
  } catch (error) {
    console.error('Password change failed:', error);
    response.status(503).json({ ok: false, error: 'Database tidak tersedia.' });
  }
});

// ---------- Accounts (admin only) ----------

app.post('/api/accounts', requireAuth('admin'), async (request, response) => {
  const username = String(request.body?.username || '').trim();
  const password = String(request.body?.password || '');
  const dosenId = String(request.body?.dosenId || '').trim();
  const nama = String(request.body?.nama || '').trim();
  if (!username || !dosenId || !nama) return response.status(400).json({ ok: false, error: 'Dosen, username, dan password wajib diisi.' });
  const passwordError = validateNewPassword(password);
  if (passwordError) return response.status(400).json({ ok: false, error: passwordError });

  const account = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    username,
    password: hashPassword(password),
    role: 'dosen',
    dosenId,
    nama,
    ...(request.body?.prodi ? { prodi: String(request.body.prodi) } : {}),
    ...(request.body?.nuptk ? { nuptk: String(request.body.nuptk) } : {}),
  };
  try {
    const result = await store.createAccount(account);
    response.json({ ok: true, account: publicAccount(account), revision: result.revision });
  } catch (error) {
    if (error.code === 'USERNAME_TAKEN') return response.status(409).json({ ok: false, error: error.message });
    console.error('Account create failed:', error);
    response.status(503).json({ ok: false, error: 'Database tidak tersedia.' });
  }
});

app.delete('/api/accounts/:id', requireAuth('admin'), async (request, response) => {
  if (request.params.id === request.user.id) return response.status(400).json({ ok: false, error: 'Tidak dapat menghapus akun sendiri.' });
  try {
    const result = await store.deleteAccount(request.params.id);
    response.json({ ok: true, deleted: result.deleted, revision: result.revision });
  } catch (error) {
    console.error('Account delete failed:', error);
    response.status(503).json({ ok: false, error: 'Database tidak tersedia.' });
  }
});

app.post('/api/accounts/:id/password', requireAuth('admin'), async (request, response) => {
  const password = String(request.body?.password || '');
  const passwordError = validateNewPassword(password);
  if (passwordError) return response.status(400).json({ ok: false, error: passwordError });
  try {
    const updated = await store.setAccountPassword(request.params.id, hashPassword(password));
    if (!updated) return response.status(404).json({ ok: false, error: 'Akun tidak ditemukan.' });
    response.json({ ok: true });
  } catch (error) {
    console.error('Password reset failed:', error);
    response.status(503).json({ ok: false, error: 'Database tidak tersedia.' });
  }
});

// ---------- Snapshot (login required, filtered per user) ----------

app.get('/api/snapshot', requireAuth(), async (request, response) => {
  try {
    const result = await store.loadSnapshot();
    response.json({ ok: true, revision: result.revision, payload: filterSnapshotForUser(request.user, result.payload) });
  } catch (error) {
    console.error('MySQL read failed:', error);
    response.status(500).json({ ok: false, error: 'Gagal membaca data MySQL.' });
  }
});

app.get('/api/verify', async (request, response) => {
  try {
    const { payload } = await store.loadSnapshot();
    const document = findVerifiedDocument(payload, String(request.query.id || ''));
    if (!document) return response.status(404).json({ valid: false });
    return response.json({ valid: true, document });
  } catch (error) {
    response.status(503).json({ valid: false, error: 'Database verifikasi tidak tersedia.' });
  }
});

app.post('/api/snapshot', requireAuth(), async (request, response) => {
  try {
    const incoming = request.body?.payload || {};
    const result = await store.saveSnapshot(incoming, request.body?.baseRevision, current => mergeSnapshotForUser(request.user, incoming, current));
    response.json({ ok: true, ...result, createdAt: new Date().toISOString() });
  } catch (error) {
    if (error.code === 'REVISION_CONFLICT') {
      return response.status(409).json({ ok: false, error: error.message, revision: error.revision });
    }
    console.error('MySQL write failed:', error);
    response.status(500).json({ ok: false, error: 'Gagal menyimpan data ke MySQL.' });
  }
});

app.get(['/api/sinta', '/api/sinta/:authorId'], requireAuth(), async (request, response) => {
  const authorId = request.params.authorId || request.query.authorId?.toString();
  const sourceUrl = request.query.sourceUrl?.toString();
  if (!authorId || !/^\d+$/.test(authorId)) {
    return response.status(400).json({ ok: false, error: 'Author ID tidak valid. Harus berupa angka.' });
  }

  const cacheKey = `${authorId}:${sourceUrl || 'profile'}`;
  const cached = sintaCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SINTA_CACHE_TTL) return response.json({ ...cached.result, cached: true });

  try {
    const result = await fetchSinta(authorId, sourceUrl);
    sintaCache.set(cacheKey, { result, timestamp: Date.now() });
    response.json({ ...result, cached: false });
  } catch (error) {
    console.error('SINTA fetch failed:', error);
    const status = error.name === 'AbortError' ? 504 : 502;
    response.status(status).json({ ok: false, error: status === 504 ? 'SINTA API timeout.' : 'Gagal mengambil data dari SINTA.' });
  }
});

// ---------- Public website content ----------

app.get('/api/public/home', async (_request, response) => {
  try {
    const [posts, stats] = await Promise.all([store.listPublicPosts(), store.publicStats()]);
    response.setHeader('Cache-Control', 'public, max-age=60');
    response.json({ ok: true, posts, stats });
  } catch (error) {
    console.error('Public content read failed:', error);
    response.status(503).json({ ok: false, error: 'Informasi publik belum dapat dimuat.' });
  }
});

app.get('/api/public-posts', requireAuth('admin'), async (_request, response) => {
  try {
    response.json({ ok: true, posts: await store.listPublicPosts({ includeDrafts: true }) });
  } catch (error) {
    console.error('Public posts read failed:', error);
    response.status(500).json({ ok: false, error: 'Gagal membaca konten publik.' });
  }
});

app.post('/api/public-posts', requireAuth('admin'), async (request, response) => {
  const id = String(request.body?.id || '').trim() || `post-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
  const result = normalizePost(request.body || {}, { id });
  if (!result.ok) return response.status(400).json(result);
  try {
    response.json({ ok: true, post: await store.savePublicPost(result.post) });
  } catch (error) {
    console.error('Public post save failed:', error);
    response.status(500).json({ ok: false, error: 'Gagal menyimpan konten publik.' });
  }
});

app.delete('/api/public-posts/:id', requireAuth('admin'), async (request, response) => {
  try {
    const deleted = await store.deletePublicPost(request.params.id);
    if (!deleted) return response.status(404).json({ ok: false, error: 'Konten tidak ditemukan.' });
    response.json({ ok: true });
  } catch (error) {
    console.error('Public post delete failed:', error);
    response.status(500).json({ ok: false, error: 'Gagal menghapus konten publik.' });
  }
});

app.post('/api/verify-turnstile', async (request, response) => {
  const result = await verifyTurnstileToken(request.body?.token, request.ip);
  if (!result.ok) return response.status(result.status).json({ ok: false, error: result.error });
  response.json({ ok: true });
});

app.use('/api', (_request, response) => response.status(404).json({ ok: false, error: 'Endpoint tidak ditemukan.' }));

// Produksi (Docker/VPS): backend juga menyajikan hasil build frontend dari dist/.
const distDir = path.resolve(process.env.STATIC_DIR || 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('*', (_request, response) => response.sendFile(path.join(distDir, 'index.html')));
}

async function fetchSinta(authorId, sourceUrl) {
  const headers = { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'UPPM-Poltek-Berau/1.0' };
  const affiliationUrl = sourceUrl?.includes('/affiliations/authors/')
    ? sourceUrl
    : `https://sinta.kemdiktisaintek.go.id/affiliations/authors/${authorId}?page=1`;
  const affiliationResponse = await fetchWithTimeout(affiliationUrl, { headers });
  if (affiliationResponse.ok) {
    const html = await affiliationResponse.text();
    if (html.includes('authors/profile/')) return { ok: true, kind: 'affiliation', data: { html, sourceUrl: affiliationUrl } };
  }

  const profileUrl = `https://sinta.kemdiktisaintek.go.id/authors/profile/${authorId}?view=garuda`;
  const profileResponse = await fetchWithTimeout(profileUrl, { headers });
  if (profileResponse.ok) return { ok: true, kind: 'profile', data: { html: await profileResponse.text(), sourceUrl: profileUrl } };

  const apiResponse = await fetchWithTimeout(`https://sinta.kemdiktisaintek.go.id/api/authors/${authorId}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'UPPM-Poltek-Berau/1.0' },
  });
  if (!apiResponse.ok) throw new Error(`SINTA API returned HTTP ${apiResponse.status}`);
  return { ok: true, kind: 'json', data: await apiResponse.json() };
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const server = app.listen(port, () => {
  console.log(`UPPM backend: http://localhost:${port}`);
  console.log('Database: MySQL');
});

async function shutdown() {
  server.close(async () => {
    await store.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
