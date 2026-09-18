import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const TABLES = {
  accounts: {
    table: 'accounts',
    columns: ['id', 'username', 'password', 'role', 'dosen_id', 'nama', 'prodi', 'nuptk', 'sort_order', 'payload'],
    values: item => [item.id, item.username, item.password, item.role, item.dosenId || null, item.nama, item.prodi || null, item.nuptk || null],
  },
  projects: {
    table: 'projects',
    columns: ['id', 'owner_id', 'judul', 'kategori', 'status', 'prodi', 'tahun_anggaran', 'dana', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.judul, item.kategori, item.status, item.prodi, item.tahunAnggaran, Number(item.dana || 0)],
  },
  publications: {
    table: 'publications',
    columns: ['id', 'owner_id', 'judul', 'jenis', 'tahun', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.judul, item.jenis, item.tahun],
  },
  surat: {
    table: 'surat_keterangan',
    columns: ['id', 'owner_id', 'nama', 'prodi', 'jenis_surat', 'status', 'tanggal_request', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.nama, item.prodi, item.jenisSurat, item.status, mysqlDate(item.tanggalRequest)],
  },
  suratTugas: {
    table: 'surat_tugas',
    columns: ['id', 'owner_id', 'nomor_surat', 'nama_kegiatan', 'jenis_kegiatan', 'prodi', 'status', 'tanggal_pengajuan', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.nomorSurat, item.namaKegiatan, item.jenisKegiatan, item.prodi, item.status, mysqlDate(item.tanggalPengajuan)],
  },
  sintaVerifications: {
    table: 'sinta_verifications',
    columns: ['id', 'owner_id', 'nama_pengaju', 'prodi', 'jenis_data', 'tahun_pelaksanaan', 'status', 'tanggal_pengajuan', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.namaPengaju, item.prodi, item.jenisData, item.tahunPelaksanaan, item.status, mysqlDate(item.tanggalPengajuan)],
  },
  claimSubmissions: {
    table: 'claim_submissions',
    columns: ['id', 'owner_id', 'nama_pengaju', 'prodi', 'jenis_klaim', 'judul', 'nominal', 'status', 'tanggal_pengajuan', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.namaPengaju, item.prodi, item.jenisKlaim, item.judul, item.nominal == null ? null : Number(item.nominal), item.status, mysqlDate(item.tanggalPengajuan)],
  },
  monthlyUpdates: {
    table: 'monthly_research_updates',
    columns: ['id', 'owner_id', 'dosen_id', 'nama_dosen', 'nuptk', 'prodi', 'bulan', 'status_laporan', 'submitted_at', 'sort_order', 'payload'],
    values: item => [item.id, item.ownerId || null, item.dosenId, item.namaDosen, item.nuptk, item.prodi, item.bulan, item.statusLaporan, mysqlDate(item.submittedAt)],
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

function databaseConfig() {
  const database = process.env.MYSQL_DATABASE || 'uppm';
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('MYSQL_DATABASE hanya boleh berisi huruf, angka, dan underscore.');
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database,
  };
}

export async function createMysqlStore() {
  const config = databaseConfig();
  const bootstrap = await mysql.createConnection({ ...config, database: undefined });
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();

  const pool = mysql.createPool({ ...config, waitForConnections: true, connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10), timezone: 'Z' });
  const statements = fs.readFileSync(path.resolve('server', 'schema.sql'), 'utf8')
    .split(/;\s*(?:\r?\n|$)/).map(statement => statement.trim()).filter(Boolean);
  for (const statement of statements) await pool.query(statement);

  await importLegacySnapshot(pool);
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
