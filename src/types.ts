export type Prodi = 'TRL' | 'SVM' | 'PM';
export type Kategori = 'Penelitian' | 'Pengabdian';
export type Skema = 'Internal' | 'Hibah Kompetitif' | 'Mandiri';
export type Status = 'Proposal' | 'Laporan Kemajuan' | 'Laporan Akhir';
export type UserRole = 'admin' | 'dosen';

export interface DosenProfile {
  id: string;
  nama: string;
  nuptk: string;
  jabatanFungsional: string;
  prodi?: Prodi;
  prodiLengkap?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string; // never sent by the server
  role: UserRole;
  dosenId?: string;
  nama: string;
  prodi?: Prodi;
  nuptk?: string;
}

export interface OwnedRecord {
  ownerId?: string;
  ownerName?: string;
  ownerNuptk?: string;
}

export interface FinalDocument {
  id: string;
  type: 'surat-tugas' | 'klaim' | 'sinta';
  title: string;
  number: string;
  approvedAt: string;
  approvedBy: string;
  barcodePayload: string;
  snapshot: Record<string, unknown>;
}

export interface StoredAttachment {
  label: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

export interface Project extends OwnedRecord {
  id: string;
  judul: string;
  abstrak: string;
  kategori: Kategori;
  skema: Skema;
  status: Status;
  prodi: Prodi;
  ketua: string;
  anggota: string;
  tahunAnggaran: string;
  dana: number;
  fileName?: string;
}

export interface Publication extends OwnedRecord {
  id: string;
  judul: string;
  penulis: string;
  jenis: 'Jurnal Nasional' | 'Jurnal Internasional' | 'Prosiding';
  namaJurnal: string;
  tahun: string;
  volume: string;
  nomor: string;
  halaman: string;
  url: string;
  fileName?: string;
}

export interface SuratKeterangan extends OwnedRecord {
  id: string;
  nama: string;
  prodi: Prodi;
  jenisSurat: 'Surat Tugas Penelitian' | 'Surat Tugas Pengabdian' | 'Surat Keterangan Selesai' | 'Lainnya';
  keperluan: string;
  tanggalRequest: string;
  status: 'Menunggu' | 'Diproses' | 'Selesai';
}

export interface AnggotaSuratTugas {
  dosenId?: string;
  nama: string;
  nuptk?: string;
  jabatan?: string;
}

export interface SuratTugas extends OwnedRecord {
  id: string;
  nomorSurat: string;
  jenisKegiatan: 'Penelitian' | 'Pengabdian kepada Masyarakat' | 'Survei' | 'Lainnya';
  namaKegiatan: string;
  lokasi: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  ketua: string;
  ketuaNuptk?: string;
  prodi: Prodi;
  anggota: AnggotaSuratTugas[];
  lampiranFileNames: string[];
  qrPayload: string;
  dasarSurat: string;
  penandatangan: string;
  jabatanPenandatangan: string;
  tanggalPengajuan: string;
  status: 'Menunggu' | 'Diproses' | 'Disetujui' | 'Ditolak';
  finalDocument?: FinalDocument;
}

export interface SintaVerification extends OwnedRecord {
  id: string;
  namaPengaju: string;
  prodi: Prodi;
  jenisData: 'Riset' | 'Pengabdian';
  tahunPelaksanaan: string;
  fields: Record<string, string>;
  catatan: string;
  fileName: string;
  tanggalPengajuan: string;
  status: 'Menunggu Verifikasi' | 'Perlu Revisi' | 'Terverifikasi';
  finalDocument?: FinalDocument;
}

export interface ClaimSubmission extends OwnedRecord {
  id: string;
  tahap?: 'Rencana Submit' | 'Reimburse';
  rencanaId?: string;
  namaPengaju: string;
  prodi: Prodi;
  jenisKlaim: 'Klaim Buku' | 'Klaim Publikasi' | 'Dana Penelitian' | 'Dana Pengabdian';
  judul: string;
  tanggalPelaksanaan: string;
  buktiKaryaFileName: string;
  buktiTransferFileName: string;
  rekeningSinarmasFileName?: string;
  attachments?: StoredAttachment[];
  nominal?: number;
  catatan: string;
  tanggalPengajuan: string;
  status: 'Menunggu' | 'Diproses' | 'Disetujui' | 'Ditolak';
  finalDocument?: FinalDocument;
}

// ========== MONTHLY RESEARCH UPDATE TYPES ==========

export interface PenelitianEntry {
  judul: string;
  status: 'Sedang Berjalan' | 'Selesai' | 'Tahap Proposal';
  deskripsi: string;
  persentase: number; // 0-100
}

export interface PublikasiEntry {
  judul: string;
  jenis: 'Jurnal Nasional' | 'Jurnal Internasional' | 'Prosiding';
  namaJurnal: string;
  tahun: string;
  sintaId?: string;
  status: 'Sudah Dipublikasikan' | 'Dalam Review' | 'Submited';
}

export interface PkmEntry {
  judul: string;
  jenis: string;
  status: 'Sedang Berjalan' | 'Selesai' | 'Tahap Proposal';
  deskripsi: string;
}

export interface MonthlyResearchUpdate extends OwnedRecord {
  id: string;
  bulan: string; // "YYYY-MM" format
  namaDosen: string;
  nuptk: string;
  prodi: Prodi;
  dosenId: string;
  statusLaporan: 'Belum' | 'Dikirim' | 'Diterima';

  // Research Progress
  penelitian: PenelitianEntry[];

  // Publications
  publikasi: PublikasiEntry[];

  // PKM Activities
  pkm: PkmEntry[];

  // SINTA Integration
  sintaProfileUrl?: string;
  sintaLastSync?: string;
  totalPublikasiSinta?: number;

  catatan: string;
  submittedAt: string;
}

export interface Notification {
  id: string;
  dosenId: string;
  bulan: string;
  type: 'reminder' | 'submission_required' | 'overdue';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SubmissionSummary {
  bulan: string;
  totalDosen: number;
  sudahSubmit: number;
  belumSubmit: number;
  perProdi: Record<Prodi, { sudah: number; belum: number }>;
}

export interface SintaPublication {
  judul: string;
  tahun: string;
  namaJurnal: string;
  jenis: 'Jurnal Nasional' | 'Jurnal Internasional' | 'Prosiding';
  sintaId: string;
  url?: string;
}
