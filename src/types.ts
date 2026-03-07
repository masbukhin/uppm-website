export type Prodi = 'TRL' | 'TSP' | 'TPM';
export type Kategori = 'Penelitian' | 'Pengabdian';
export type Skema = 'Internal' | 'Hibah Kompetitif' | 'Mandiri';
export type Status = 'Proposal' | 'Laporan Kemajuan' | 'Laporan Akhir';

export interface Project {
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

export interface Publication {
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

export interface SuratKeterangan {
  id: string;
  nama: string;
  prodi: Prodi;
  jenisSurat: 'Surat Tugas Penelitian' | 'Surat Tugas Pengabdian' | 'Surat Keterangan Selesai' | 'Lainnya';
  keperluan: string;
  tanggalRequest: string;
  status: 'Menunggu' | 'Diproses' | 'Selesai';
}
