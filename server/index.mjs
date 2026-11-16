import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import { createMysqlStore } from './mysql.mjs';
import { findVerifiedDocument } from './document-verification.mjs';
import verifyTurnstile from '../api/verify-turnstile.mjs';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.local', override: false });

const app = express();
const port = Number(process.env.PORT || 4100);
const sintaCache = new Map();
const SINTA_CACHE_TTL = 5 * 60 * 1000;

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', process.env.APP_ORIGIN || 'http://localhost:3000');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (request.method === 'OPTIONS') return response.sendStatus(204);
  next();
});
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '25mb' }));

let store;
try {
  store = await createMysqlStore();
} catch (error) {
  console.error('MySQL tidak dapat diinisialisasi:', error.message);
  console.error('Isi MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, dan MYSQL_DATABASE di .env.local.');
  process.exit(1);
}

app.get('/api/health', async (_request, response) => {
  try {
    response.json({ ok: true, database: await store.health() });
  } catch (error) {
    response.status(503).json({ ok: false, error: error.message });
  }
});

app.get('/api/snapshot', async (_request, response) => {
  try {
    const result = await store.loadSnapshot();
    response.json({ ok: true, ...result });
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

app.post('/api/snapshot', async (request, response) => {
  try {
    const result = await store.saveSnapshot(request.body?.payload || {}, request.body?.baseRevision);
    response.json({ ok: true, ...result, createdAt: new Date().toISOString() });
  } catch (error) {
    if (error.code === 'REVISION_CONFLICT') {
      return response.status(409).json({ ok: false, error: error.message, revision: error.revision });
    }
    console.error('MySQL write failed:', error);
    response.status(500).json({ ok: false, error: 'Gagal menyimpan data ke MySQL.' });
  }
});

app.get('/api/records', async (request, response) => {
  try {
    const { payload } = await store.loadSnapshot();
    const rows = Object.entries(payload).flatMap(([type, items]) => items.map(item => ({ type, payload: item })));
    const ownerId = request.query.ownerId?.toString();
    response.json(ownerId ? rows.filter(row => row.payload.ownerId === ownerId) : rows);
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.get(['/api/sinta', '/api/sinta/:authorId'], async (request, response) => {
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

app.post('/api/verify-turnstile', verifyTurnstile);

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
