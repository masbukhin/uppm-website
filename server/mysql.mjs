import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

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
  return {
    async health() {
      await pool.query('SELECT 1');
      return { driver: 'mysql', host: config.host, port: config.port, database: config.database };
    },
    async loadSnapshot() {
      const connection = await pool.getConnection();
      try {
        const [[state]] = await connection.query('SELECT revision FROM app_state WHERE id = 1');
        const payload = {};
        for (const [key, definition] of Object.entries(TABLES)) {
          const [rows] = await connection.query(`SELECT payload FROM \`${definition.table}\` ORDER BY sort_order ASC`);
          payload[key] = rows.map(row => typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload);
        }
        return { payload, revision: Number(state?.revision || 0) };
      } finally {
        connection.release();
      }
    },
    async saveSnapshot(payload, expectedRevision) {
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
        let saved = 0;
        for (const [key, definition] of Object.entries(TABLES)) {
          if (key === 'lecturerProfiles' && !Array.isArray(payload[key])) continue;
          const items = Array.isArray(payload[key]) ? payload[key] : [];
          await connection.query(`DELETE FROM \`${definition.table}\``);
          await insertItems(connection, definition, items);
          saved += items.length;
        }
        const nextRevision = revision + 1;
        await connection.execute('UPDATE app_state SET revision = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = 1', [nextRevision]);
        await connection.commit();
        return { saved, revision: nextRevision };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async close() { await pool.end(); },
  };
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
