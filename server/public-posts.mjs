import { FUNDING_SEEDS, RETIRED_SEED_IDS } from './funding-seeds.mjs';

// Public website content (announcements, funding calls, news) managed by UPPM admins.
// Stored in its own table so snapshot saves never touch it.

export const POST_KINDS = ['pengumuman', 'pendanaan', 'berita'];

const TEXT_LIMITS = {
  judul: 255, ringkasan: 600, isi: 20000, penyelenggara: 255, skema: 255,
  periode: 255, tautan: 1000, gambar: 1000, sumber: 1000, lingkup: 50, kontak: 255,
};

function cleanText(value, limit) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, limit);
}

function cleanUrl(value) {
  const text = cleanText(value, TEXT_LIMITS.tautan);
  if (!text) return '';
  if (text.startsWith('/')) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function cleanDate(value) {
  if (!value) return '';
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(new Date(text).getTime()) ? text : '';
}

/** Validates admin input. Returns { ok, post } or { ok: false, error }. */
export function normalizePost(input, { id, now = new Date() } = {}) {
  const kind = POST_KINDS.includes(input?.kind) ? input.kind : null;
  if (!kind) return { ok: false, error: 'Jenis konten tidak valid.' };
  const judul = cleanText(input.judul, TEXT_LIMITS.judul);
  if (judul.length < 3) return { ok: false, error: 'Judul minimal 3 karakter.' };
  const publishedAt = cleanDate(input.publishedAt) || now.toISOString().slice(0, 10);
  const post = {
    id: id || cleanText(input.id, 100),
    kind,
    judul,
    ringkasan: cleanText(input.ringkasan, TEXT_LIMITS.ringkasan),
    isi: cleanText(input.isi, TEXT_LIMITS.isi),
    penyelenggara: cleanText(input.penyelenggara, TEXT_LIMITS.penyelenggara),
    skema: cleanText(input.skema, TEXT_LIMITS.skema),
    lingkup: cleanText(input.lingkup, TEXT_LIMITS.lingkup),
    periode: cleanText(input.periode, TEXT_LIMITS.periode),
    kontak: cleanText(input.kontak, TEXT_LIMITS.kontak),
    tanggalBuka: cleanDate(input.tanggalBuka),
    tenggat: cleanDate(input.tenggat),
    tautan: cleanUrl(input.tautan),
    gambar: cleanUrl(input.gambar),
    sumber: cleanUrl(input.sumber),
    publishedAt,
    isPublished: input.isPublished !== false,
    isPinned: Boolean(input.isPinned),
  };
  if (!post.id) return { ok: false, error: 'ID konten kosong.' };
  return { ok: true, post };
}

function rowToPost(row) {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
  return { ...payload, id: row.id, kind: row.kind, judul: row.judul, isPublished: Boolean(row.is_published), isPinned: Boolean(row.is_pinned) };
}

export async function listPosts(pool, { includeDrafts = false } = {}) {
  const [rows] = await pool.query(
    `SELECT id, kind, judul, is_published, is_pinned, payload FROM public_posts
     ${includeDrafts ? '' : 'WHERE is_published = TRUE'} ORDER BY is_pinned DESC, published_at DESC, id DESC`,
  );
  return rows.map(rowToPost);
}

export async function upsertPost(pool, post) {
  await pool.execute(
    `INSERT INTO public_posts (id, kind, judul, is_published, is_pinned, published_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE kind = VALUES(kind), judul = VALUES(judul), is_published = VALUES(is_published),
       is_pinned = VALUES(is_pinned), published_at = VALUES(published_at), payload = VALUES(payload)`,
    [post.id, post.kind, post.judul, post.isPublished, post.isPinned, new Date(post.publishedAt), JSON.stringify(post)],
  );
  return post;
}

export async function deletePost(pool, id) {
  const [result] = await pool.execute('DELETE FROM public_posts WHERE id = ?', [String(id)]);
  return result.affectedRows > 0;
}

/** Aggregate counts only: no names or personal data leave the server. */
export async function publicStats(pool) {
  const [[projects]] = await pool.query(
    `SELECT SUM(kategori = 'Penelitian') AS penelitian, SUM(kategori = 'Pengabdian') AS pengabdian, COALESCE(SUM(dana), 0) AS dana FROM projects`,
  );
  const [[publications]] = await pool.query('SELECT COUNT(*) AS total FROM publications');
  const [[lecturers]] = await pool.query('SELECT COUNT(*) AS total FROM lecturer_profiles');
  return {
    penelitian: Number(projects.penelitian || 0),
    pengabdian: Number(projects.pengabdian || 0),
    dana: Number(projects.dana || 0),
    publikasi: Number(publications.total || 0),
    dosen: Number(lecturers.total || 0),
  };
}

const SOURCE_IG = 'https://www.instagram.com/p/Dfn1JIcj6Fe/';

// First-run content: the 2027 grant calendar shared by LPPM UPN "Veteran" Jawa Timur (11 Nov 2026).
// Schedules are estimates from the source post; admins should confirm on each organizer's site.
export const SEED_POSTS = [
  {
    id: 'seed-pengumuman-kalender-hibah-2027', kind: 'pengumuman', isPinned: true, publishedAt: '2026-11-23',
    judul: 'Kalender Hibah 2027 untuk Dosen & Akademisi',
    ringkasan: 'Rangkuman peluang hibah penelitian nasional dan internasional tahun 2027. Siapkan proposal sejak sekarang.',
    isi: 'UPPM Politeknik Sinar Mas Berau Coal mengajak seluruh dosen menyiapkan proposal hibah tahun 2027.\n\nHibah nasional:\n- BIMA Kemdiktisaintek: perkiraan pendaftaran Desember 2026 – Februari 2027.\n- RIIM Kompetisi LPDP & BRIN: perkiraan Mei – Juli 2027.\n\nHibah dan fellowship internasional: JSPS Postdoctoral Fellowship (Jepang), Humboldt Research Fellowship (Jerman), Fulbright Visiting Scholar (Amerika Serikat), DAAD Research Grants (Jerman), MSCA Postdoctoral Fellowships (Uni Eropa), Newton International Fellowship (Inggris), dan e-ASIA Joint Research Program.\n\nJadwal merupakan perkiraan dan dapat berubah. Pastikan kembali melalui laman resmi masing-masing penyelenggara. Dosen yang berminat dapat berkonsultasi dengan UPPM untuk pendampingan penyusunan proposal.',
    penyelenggara: 'UPPM Politeknik Sinar Mas Berau Coal', sumber: SOURCE_IG,
  },
];

// First-run funding seeds from the Instagram post, replaced by FUNDING_SEEDS (kept to detect unedited rows).
const LEGACY_FUNDING_SEEDS = [
  {
    id: 'seed-dana-bima-2027', kind: 'pendanaan', publishedAt: '2026-11-23', lingkup: 'Nasional',
    judul: 'Hibah Penelitian & Pengabdian BIMA 2027', penyelenggara: 'Kemdiktisaintek',
    skema: 'Penelitian dan pengabdian kepada masyarakat', periode: 'Perkiraan Desember 2026 – Februari 2027',
    tanggalBuka: '2026-12-01', tenggat: '2027-02-28', tautan: 'https://bima.kemdiktisaintek.go.id/', sumber: SOURCE_IG,
    ringkasan: 'Pendanaan kompetitif nasional melalui sistem BIMA. Jadwal resmi diumumkan melalui laman BIMA.',
  },
  {
    id: 'seed-dana-riim-2027', kind: 'pendanaan', publishedAt: '2026-11-23', lingkup: 'Nasional',
    judul: 'RIIM Kompetisi 2027', penyelenggara: 'LPDP & BRIN', skema: 'Riset dan Inovasi untuk Indonesia Maju',
    periode: 'Perkiraan Mei – Juli 2027', tanggalBuka: '2027-05-01', tenggat: '2027-07-31',
    tautan: 'https://rispro.brin.go.id/', sumber: SOURCE_IG,
    ringkasan: 'Pendanaan riset kompetitif LPDP dan BRIN untuk periset dan dosen Indonesia.',
  },
  ...[
    ['jsps', 'JSPS Postdoctoral Fellowship', 'Japan Society for the Promotion of Science (Jepang)', 'https://www.jsps.go.jp/english/'],
    ['humboldt', 'Humboldt Research Fellowship', 'Alexander von Humboldt Foundation (Jerman)', 'https://www.humboldt-foundation.de/en/'],
    ['fulbright', 'Fulbright Visiting Scholar', 'AMINEF / Fulbright (Amerika Serikat)', 'https://www.aminef.or.id/'],
    ['daad', 'DAAD Research Grants', 'DAAD (Jerman)', 'https://www.daad.id/'],
    ['msca', 'MSCA Postdoctoral Fellowships', 'Marie Skłodowska-Curie Actions (Uni Eropa)', 'https://marie-sklodowska-curie-actions.ec.europa.eu/'],
    ['newton', 'Newton International Fellowship', 'The Royal Society (Inggris)', 'https://royalsociety.org/grants/newton-international/'],
    ['easia', 'e-ASIA Joint Research Program', 'e-ASIA JRP (Asia Timur & Tenggara)', 'https://www.the-easia.org/jrp/'],
  ].map(([key, judul, penyelenggara, tautan]) => ({
    id: `seed-dana-${key}-2027`, kind: 'pendanaan', publishedAt: '2026-11-23', lingkup: 'Internasional',
    judul, penyelenggara, tautan, sumber: SOURCE_IG, periode: 'Cek jadwal di laman resmi',
    ringkasan: 'Fellowship atau hibah riset internasional. Periode pendaftaran mengikuti laman resmi penyelenggara.',
  })),
];

/**
 * Adds each seed post once. A seed already applied is never re-added, so admin edits
 * and deletions survive later deploys; new seeds shipped in code still appear.
 */
export async function applySeedPosts(pool, seeds = [...SEED_POSTS, ...FUNDING_SEEDS]) {
  const [applied] = await pool.query('SELECT id FROM public_post_seeds');
  const done = new Set(applied.map(row => row.id));
  let added = 0;
  for (const seed of seeds) {
    if (done.has(seed.id)) continue;
    const [[exists]] = await pool.execute('SELECT id FROM public_posts WHERE id = ? LIMIT 1', [seed.id]);
    if (!exists) {
      const result = normalizePost(seed, { id: seed.id });
      if (result.ok) { await upsertPost(pool, result.post); added += 1; }
    }
    await pool.execute('INSERT IGNORE INTO public_post_seeds (id) VALUES (?)', [seed.id]);
  }
  if (added) console.log(`${added} konten publik awal ditambahkan.`);
  await retireLegacySeeds(pool, done);
  return added;
}

const COMPARED_FIELDS = ['judul', 'ringkasan', 'isi', 'penyelenggara', 'periode', 'tanggalBuka', 'tenggat', 'tautan', 'gambar'];

/** Removes replaced first-run seeds once, but only rows an admin has not edited. */
async function retireLegacySeeds(pool, done) {
  for (const id of RETIRED_SEED_IDS) {
    const marker = `retired:${id}`;
    if (done.has(marker)) continue;
    const legacy = LEGACY_FUNDING_SEEDS.find(seed => seed.id === id);
    const [[row]] = await pool.execute('SELECT payload FROM public_posts WHERE id = ? LIMIT 1', [id]);
    if (row && legacy) {
      const current = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      const original = normalizePost(legacy, { id }).post;
      if (COMPARED_FIELDS.every(field => (current?.[field] ?? '') === (original[field] ?? ''))) await deletePost(pool, id);
    }
    await pool.execute('INSERT IGNORE INTO public_post_seeds (id) VALUES (?)', [marker]);
  }
}
