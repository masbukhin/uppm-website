import { createMysqlStore } from '../server/mysql.mjs';

const SNAPSHOT_KEY = 'uppm:snapshot';

let memoryState = { revision: 0, payload: null };
let mysqlStorePromise;

function mysqlConfigured() {
  return Boolean(
    (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE)
    || (process.env.TIDB_HOST && process.env.TIDB_USER && process.env.TIDB_DATABASE),
  );
}

function getMysqlStore() {
  mysqlStorePromise ||= createMysqlStore({ importLegacy: false });
  return mysqlStorePromise;
}

function normalizeState(value) {
  if (!value) return { revision: 0, payload: null };
  if (Object.hasOwn(value, 'payload') && Object.hasOwn(value, 'revision')) {
    return { version: 1, revision: Number(value.revision || 0), payload: value.payload };
  }
  return { version: 1, revision: 0, payload: value };
}

async function readKvSnapshot() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const response = await fetch(`${url}/get/${encodeURIComponent(SNAPSHOT_KEY)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`KV read failed: ${response.status}`);

  const result = await response.json();
  if (!result.result) return null;
  return typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
}

async function writeKvSnapshot(payload) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;

  const response = await fetch(`${url}/set/${encodeURIComponent(SNAPSHOT_KEY)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`KV write failed: ${response.status}`);
  return true;
}

export default async function handler(request, response) {
  if (mysqlConfigured()) {
    try {
      const store = await getMysqlStore();
      if (request.method === 'GET') {
        const state = await store.loadSnapshot();
        return response.status(200).json({ ok: true, ...state, database: 'mysql' });
      }
      if (request.method === 'POST') {
        const result = await store.saveSnapshot(request.body?.payload || {}, request.body?.baseRevision);
        return response.status(200).json({ ok: true, ...result, database: 'mysql', createdAt: new Date().toISOString() });
      }
    } catch (error) {
      if (error.code === 'REVISION_CONFLICT') {
        return response.status(409).json({ ok: false, error: error.message, revision: error.revision });
      }
      console.error('MySQL snapshot failed:', error);
      return response.status(500).json({ ok: false, error: 'Koneksi atau operasi MySQL gagal.' });
    }
  }

  if (request.method === 'GET') {
    try {
      const state = normalizeState(await readKvSnapshot() || memoryState);
      return response.status(200).json({ ok: true, payload: state.payload, revision: state.revision });
    } catch (error) {
      console.error('Snapshot read failed:', error);
      return response.status(500).json({ ok: false, error: 'Gagal membaca database snapshot.' });
    }
  }

  if (request.method === 'POST') {
    const payload = request.body?.payload ?? request.body ?? {};
    const currentState = normalizeState(await readKvSnapshot().catch(() => null) || memoryState);
    const expectedRevision = request.body?.baseRevision;
    if (expectedRevision != null && Number(expectedRevision) !== Number(currentState.revision)) {
      return response.status(409).json({ ok: false, error: 'Database telah berubah. Muat ulang halaman.', revision: currentState.revision });
    }
    const state = { version: 1, revision: Number(currentState.revision) + 1, payload };
    memoryState = state;

    try {
      const persisted = await writeKvSnapshot(state);
      return response.status(200).json({ ok: true, persisted, revision: state.revision, createdAt: new Date().toISOString() });
    } catch (error) {
      console.error('Snapshot write failed:', error);
      return response.status(500).json({ ok: false, error: 'Gagal menyimpan database snapshot.' });
    }
  }

  response.setHeader('Allow', 'GET, POST');
  return response.status(405).json({ ok: false, error: 'Method not allowed.' });
}
