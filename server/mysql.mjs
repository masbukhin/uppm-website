import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { disabledPasswordHash, hashPassword, isPasswordHash } from './auth.mjs';
import { deletePost, listPosts, publicStats, seedPostsIfEmpty, upsertPost } from './public-posts.mjs';

// Old demo credentials that were once public; accounts using them get disabled.
const LEAKED_DEMO_CREDENTIALS = new Set(['admin:admin123', 'dosen:dosen123']);

const TABLES = {
  lecturerProfiles: {
    table: 'lecturer_profiles',
    columns: ['id', 'nama', 'nuptk', 'prodi', 'jabatan_fungsional', 'prodi_lengkap', 'sort_order', 'payload'],
    values: item => [item.id, item.nama, item.nuptk, mysqlProdi(item.prodi), item.jabatanFungsional || '-', item.prodiLengkap || null],
  },
  accounts: {
    table: 'accounts',
    columns: ['id', 'username', 'password', 'role', 'dosen_id', 'nama', 'prodi', 'nuptk', 'sort_order', 'payload'],
    values: item => [item.id, item.username, item.password, item.role, item.dosenId || null, item.nama, mysqlProdi(item.prodi), item.nuptk || null],
  },
  projects: {
    table: 'projects',
    columns: ['id', 'owner_id', 'judul', 'kategori', 'status', 'prodi', 'tahun_anggaran', 'dana', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.judul, item.kategori, item.status, mysqlProdi(item.prodi), item.tahunAnggaran, Number(item.dana || 0)],
  },
  publications: {
    table: 'publications',
    columns: ['id', 'owner_id', 'judul', 'jenis', 'tahun', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.judul, item.jenis, item.tahun],
  },
  surat: {
    table: 'surat_keterangan',
    columns: ['id', 'owner_id', 'nama', 'prodi', 'jenis_surat', 'status', 'tanggal_request', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.nama, mysqlProdi(item.prodi), item.jenisSurat, item.status, mysqlDate(item.tanggalRequest)],
  },
  suratTugas: {
    table: 'surat_tugas',
    columns: ['id', 'owner_id', 'nomor_surat', 'nama_kegiatan', 'jenis_kegiatan', 'prodi', 'status', 'tanggal_pengajuan', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.nomorSurat, item.namaKegiatan, item.jenisKegiatan, mysqlProdi(item.prodi), item.status, mysqlDate(item.tanggalPengajuan)],
  },
  sintaVerifications: {
    table: 'sinta_verifications',
    columns: ['id', 'owner_id', 'nama_pengaju', 'prodi', 'jenis_data', 'tahun_pelaksanaan', 'status', 'tanggal_pengajuan', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.namaPengaju, mysqlProdi(item.prodi), item.jenisData, item.tahunPelaksanaan, item.status, mysqlDate(item.tanggalPengajuan)],
  },
  claimSubmissions: {
    table: 'claim_submissions',
    columns: ['id', 'tahap', 'rencana_id', 'owner_id', 'nama_pengaju', 'prodi', 'jenis_klaim', 'judul', 'nominal', 'status', 'tanggal_pengajuan', 'sort_order', 'payload'],
    values: item => [item.id, item.tahap || 'Reimburse', item.rencanaId || null, item.ownerId || null, item.namaPengaju, mysqlProdi(item.prodi), item.jenisKlaim, item.judul, item.nominal == null ? null : Number(item.nominal), item.status, mysqlDate(item.tanggalPengajuan)],
  },
  monthlyUpdates: {
    table: 'monthly_research_updates',
    columns: ['id', 'owner_id', 'dosen_id', 'nama_dosen', 'nuptk', 'prodi', 'bulan', 'status_laporan', 'submitted_at', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.dosenId, item.namaDosen, item.nuptk, mysqlProdi(item.prodi), item.bulan, item.statusLaporan, mysqlDate(item.submittedAt)],
  },
  notifications: {
    table: 'notifications',
    columns: ['id', 'dosen_id', 'bulan', 'type', 'is_read', 'created_at', 'sort_order', 'payload'],
    values: item => [item.id, item.dosenId, item.bulan, item.type, Boolean(item.isRead), mysqlDate(item.createdAt)],
  },
};

function mysqlDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function mysqlProdi(value) {
  if (!value) return null;
  if (value === 'SVM' || value === 'TSP') return 'SVM';
  if (value === 'PM' || value === 'TPM') return 'PM';
  return 'TRL';
}

function databaseConfig() {
  const tidb = Boolean(process.env.TIDB_HOST);
  const database = process.env.MYSQL_DATABASE || process.env.TIDB_DATABASE || 'uppm';
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('MYSQL_DATABASE hanya boleh berisi huruf, angka, dan underscore.');
  const sslEnabled = tidb || process.env.MYSQL_SSL === 'true';
  return {
    host: process.env.MYSQL_HOST || process.env.TIDB_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || process.env.TIDB_PORT || 3306),
    user: process.env.MYSQL_USER || process.env.TIDB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.TIDB_PASSWORD || '',
    database,
    ...(sslEnabled ? { ssl: { rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false' } } : {}),
  };
}

export async function createMysqlStore({ importLegacy = true } = {}) {
  const config = databaseConfig();
  const createDatabase = process.env.MYSQL_CREATE_DATABASE
    ? process.env.MYSQL_CREATE_DATABASE === 'true'
    : !process.env.VERCEL;
  if (createDatabase) {
    const bootstrap = await mysql.createConnection({ ...config, database: undefined });
    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await bootstrap.end();
  }

  const pool = mysql.createPool({ ...config, waitForConnections: true, connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10), timezone: 'Z' });
  const statements = fs.readFileSync(path.resolve('server', 'schema.sql'), 'utf8')
    .split(/;\s*(?:\r?\n|$)/).map(statement => statement.trim()).filter(Boolean);
  for (const statement of statements) await pool.query(statement);
  await ensureClaimWorkflowSchema(pool, config.database);

  if (importLegacy) await importLegacySnapshot(pool);
  await migratePlaintextPasswords(pool);
  await seedPostsIfEmpty(pool);

  // Runs `work` in a transaction that holds the app_state row lock, then bumps the revision.
  async function withRevisionLock(work, expectedRevision) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[state]] = await connection.query('SELECT revision FROM app_state WHERE id = 1 FOR UPDATE');
      const revision = Number(state?.revision || 0);
      if (expectedRevision != null && Number(expectedRevision) !== revision) {
        const error = new Error('Database telah berubah. Muat ulang halaman sebelum menyimpan lagi.');
        error.code = 'REVISION_CONFLICT';
        error.revision = revision;
        throw error;
      }
      const result = await work(connection);
      const nextRevision = revision + 1;
      await connection.execute('UPDATE app_state SET revision = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = 1', [nextRevision]);
      await connection.commit();
      return { ...result, revision: nextRevision };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  return {
    async health() {
      await pool.query('SELECT 1');
      return { driver: 'mysql', database: config.database };
    },
    async loadSnapshot() {
      const connection = await pool.getConnection();
      try {
        const [[state]] = await connection.query('SELECT revision FROM app_state WHERE id = 1');
        return { payload: await readPayload(connection), revision: Number(state?.revision || 0) };
      } finally {
        connection.release();
      }
    },
    /**
     * Replaces all collections except accounts. `transform(currentPayload)` may rewrite the
     * incoming payload inside the transaction (used for per-user access rules).
     */
    async saveSnapshot(payload, expectedRevision, transform) {
      return withRevisionLock(async connection => {
        const finalPayload = transform ? transform(await readPayload(connection)) : payload;
        let saved = 0;
        for (const [key, definition] of Object.entries(TABLES)) {
          if (key === 'accounts') continue; // credentials are managed through the accounts API only
          if (key === 'lecturerProfiles' && !Array.isArray(finalPayload[key])) continue;
          const items = Array.isArray(finalPayload[key]) ? finalPayload[key] : [];
          await connection.query(`DELETE FROM \`${definition.table}\``);
          await insertItems(connection, definition, items);
          saved += items.length;
        }
        return { saved };
      }, expectedRevision);
    },
    async findAccountByUsername(username) {
      const [rows] = await pool.execute('SELECT id, username, password, role, payload FROM accounts WHERE username = ? LIMIT 1', [String(username)]);
      return rows[0] ? accountFromRow(rows[0]) : null;
    },
    async getAccountById(id) {
      const [rows] = await pool.execute('SELECT id, username, password, role, payload FROM accounts WHERE id = ? LIMIT 1', [String(id)]);
      return rows[0] ? accountFromRow(rows[0]) : null;
    },
    async hasAdmin() {
      const [[row]] = await pool.query("SELECT COUNT(*) AS total FROM accounts WHERE role = 'admin'");
      return Number(row.total) > 0;
    },
    /** `account.password` must already be a hash. Set `onlyIfNoAdmin` for first-run setup. */
    async createAccount(account, { onlyIfNoAdmin = false } = {}) {
      return withRevisionLock(async connection => {
        if (onlyIfNoAdmin) {
          const [[row]] = await connection.query("SELECT COUNT(*) AS total FROM accounts WHERE role = 'admin'");
          if (Number(row.total) > 0) throw Object.assign(new Error('Akun admin sudah tersedia.'), { code: 'ADMIN_EXISTS' });
        }
        const [[existing]] = await connection.execute('SELECT id FROM accounts WHERE username = ? LIMIT 1', [account.username]);
        if (existing) throw Object.assign(new Error('Username sudah dipakai.'), { code: 'USERNAME_TAKEN' });
        const [[order]] = await connection.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM accounts');
        await insertAccount(connection, account, Number(order.next));
        return { account };
      });
    },
    async deleteAccount(id) {
      return withRevisionLock(async connection => {
        const [result] = await connection.execute('DELETE FROM accounts WHERE id = ?', [String(id)]);
        return { deleted: result.affectedRows };
      });
    },
    /** `passwordHash` must already be a hash. */
    async setAccountPassword(id, passwordHash) {
      const [result] = await pool.execute('UPDATE accounts SET password = ? WHERE id = ?', [passwordHash, String(id)]);
      return result.affectedRows > 0;
    },
    listPublicPosts(options) { return listPosts(pool, options); },
    savePublicPost(post) { return upsertPost(pool, post); },
    deletePublicPost(id) { return deletePost(pool, id); },
    publicStats() { return publicStats(pool); },
    async close() { await pool.end(); },
  };
}

async function readPayload(connection) {
  const payload = {};
  for (const [key, definition] of Object.entries(TABLES)) {
    const [rows] = await connection.query(`SELECT payload FROM \`${definition.table}\` ORDER BY sort_order ASC`);
    payload[key] = rows.map(row => typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload);
  }
  payload.accounts = payload.accounts.map(({ password: _password, ...rest }) => rest);
  return payload;
}

function accountFromRow(row) {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
  const { password: _password, ...rest } = payload;
  return { ...rest, id: row.id, username: row.username, role: row.role, password: row.password };
}

async function insertAccount(connection, account, sortOrder) {
  const definition = TABLES.accounts;
  const columns = definition.columns.map(column => `\`${column}\``).join(', ');
  const placeholders = definition.columns.map(() => '?').join(', ');
  const { password: _password, ...payload } = account;
  await connection.execute(
    `INSERT INTO \`${definition.table}\` (${columns}) VALUES (${placeholders})`,
    [...definition.values(account), sortOrder, JSON.stringify(payload)],
  );
}

// Hash any plaintext password left from older versions; disable leaked demo credentials.
async function migratePlaintextPasswords(pool) {
  const [rows] = await pool.query('SELECT id, username, password, payload FROM accounts');
  let migrated = 0;
  for (const row of rows) {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
    const payloadHasPassword = Object.hasOwn(payload, 'password');
    if (isPasswordHash(row.password) && !payloadHasPassword) continue;
    const { password: _password, ...cleanPayload } = payload;
    let hash = row.password;
    if (!isPasswordHash(hash)) {
      hash = LEAKED_DEMO_CREDENTIALS.has(`${row.username}:${row.password}`) ? disabledPasswordHash() : hashPassword(row.password);
    }
    await pool.execute('UPDATE accounts SET password = ?, payload = ? WHERE id = ?', [hash, JSON.stringify(cleanPayload), row.id]);
    migrated += 1;
  }
  if (migrated) console.log(`${migrated} akun dimigrasi ke password hash (scrypt).`);
}

async function ensureClaimWorkflowSchema(pool, database) {
  const [columns] = await pool.execute(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [database, 'claim_submissions'],
  );
  const names = new Set(columns.map(row => row.COLUMN_NAME));
  if (!names.has('tahap')) {
    await pool.query("ALTER TABLE claim_submissions ADD COLUMN tahap ENUM('Rencana Submit','Reimburse') NOT NULL DEFAULT 'Reimburse' AFTER id");
  }
  if (!names.has('rencana_id')) {
    await pool.query('ALTER TABLE claim_submissions ADD COLUMN rencana_id VARCHAR(100) NULL AFTER tahap');
  }

  const [indexes] = await pool.execute(
    'SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [database, 'claim_submissions'],
  );
  const indexNames = new Set(indexes.map(row => row.INDEX_NAME));
  if (!indexNames.has('idx_claims_tahap')) await pool.query('CREATE INDEX idx_claims_tahap ON claim_submissions (tahap)');
  if (!indexNames.has('idx_claims_rencana')) await pool.query('CREATE INDEX idx_claims_rencana ON claim_submissions (rencana_id)');
}

async function insertItems(connection, definition, items) {
  const columns = definition.columns.map(column => `\`${column}\``).join(', ');
  const placeholders = definition.columns.map(() => '?').join(', ');
  for (const [index, item] of items.entries()) {
    await connection.execute(
      `INSERT INTO \`${definition.table}\` (${columns}) VALUES (${placeholders})`,
      [...definition.values(item), index, JSON.stringify(item)],
    );
  }
}

async function importLegacySnapshot(pool) {
  const [[state]] = await pool.query('SELECT revision FROM app_state WHERE id = 1');
  if (Number(state?.revision || 0) > 0) return;
  const legacyPath = path.resolve('data', 'uppm.sqlite');
  if (!fs.existsSync(legacyPath)) return;

  const { default: Database } = await import('better-sqlite3');
  const legacyDb = new Database(legacyPath, { readonly: true });
  try {
    const row = legacyDb.prepare('SELECT payload FROM snapshots ORDER BY id DESC LIMIT 1').get();
    if (!row?.payload) return;
    const snapshot = JSON.parse(row.payload);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const [key, definition] of Object.entries(TABLES)) {
        await insertItems(connection, definition, Array.isArray(snapshot[key]) ? snapshot[key] : []);
      }
      await connection.query('UPDATE app_state SET revision = 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = 1');
      await connection.commit();
      console.log('Snapshot SQLite lama berhasil diimpor ke MySQL.');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } finally {
    legacyDb.close();
  }
}
