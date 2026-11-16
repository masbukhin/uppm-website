CREATE TABLE IF NOT EXISTS app_state (
  id TINYINT UNSIGNED PRIMARY KEY,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_app_state_singleton CHECK (id = 1)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lecturer_profiles (
  id VARCHAR(100) PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  nuptk VARCHAR(50) NOT NULL,
  prodi ENUM('TRL','SVM','PM') NULL,
  jabatan_fungsional VARCHAR(255) NOT NULL DEFAULT '-',
  prodi_lengkap VARCHAR(255) NULL,
  sort_order INT UNSIGNED NOT NULL,
  payload JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_lecturer_profiles_nuptk (nuptk)
) ENGINE=InnoDB;

INSERT INTO app_state (id, revision) VALUES (1, 0) ON DUPLICATE KEY UPDATE id = VALUES(id);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(100) PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL,
  role ENUM('admin','dosen') NOT NULL, dosen_id VARCHAR(100) NULL, nama VARCHAR(255) NOT NULL,
  prodi ENUM('TRL','SVM','PM') NULL, nuptk VARCHAR(50) NULL, sort_order INT UNSIGNED NOT NULL,
  payload JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_accounts_dosen (dosen_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(100) PRIMARY KEY, owner_id VARCHAR(100) NULL, judul VARCHAR(500) NOT NULL,
  kategori ENUM('Penelitian','Pengabdian') NOT NULL, status ENUM('Proposal','Laporan Kemajuan','Laporan Akhir') NOT NULL,
  prodi ENUM('TRL','SVM','PM') NOT NULL, tahun_anggaran VARCHAR(20) NOT NULL, dana DECIMAL(18,2) NOT NULL DEFAULT 0,
  sort_order INT UNSIGNED NOT NULL, payload JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_projects_owner (owner_id), INDEX idx_projects_status (status), CONSTRAINT chk_projects_dana CHECK (dana >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS publications (
  id VARCHAR(100) PRIMARY KEY, owner_id VARCHAR(100) NULL, judul VARCHAR(500) NOT NULL,
  jenis ENUM('Jurnal Nasional','Jurnal Internasional','Prosiding') NOT NULL, tahun VARCHAR(10) NOT NULL,
  sort_order INT UNSIGNED NOT NULL, payload JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_publications_owner (owner_id), INDEX idx_publications_year (tahun)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS surat_keterangan (
  id VARCHAR(100) PRIMARY KEY, owner_id VARCHAR(100) NULL, nama VARCHAR(255) NOT NULL, prodi ENUM('TRL','SVM','PM') NOT NULL,
  jenis_surat VARCHAR(100) NOT NULL, status ENUM('Menunggu','Diproses','Selesai') NOT NULL, tanggal_request DATETIME(3) NOT NULL,
  sort_order INT UNSIGNED NOT NULL, payload JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), INDEX idx_surat_owner (owner_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS surat_tugas (
  id VARCHAR(100) PRIMARY KEY, owner_id VARCHAR(100) NULL, nomor_surat VARCHAR(100) NOT NULL UNIQUE,
  nama_kegiatan VARCHAR(500) NOT NULL, jenis_kegiatan VARCHAR(100) NOT NULL, prodi ENUM('TRL','SVM','PM') NOT NULL,
  status ENUM('Menunggu','Diproses','Disetujui','Ditolak') NOT NULL, tanggal_pengajuan DATETIME(3) NOT NULL,
  sort_order INT UNSIGNED NOT NULL, payload JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), INDEX idx_surat_tugas_owner (owner_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sinta_verifications (
  id VARCHAR(100) PRIMARY KEY, owner_id VARCHAR(100) NULL, nama_pengaju VARCHAR(255) NOT NULL, prodi ENUM('TRL','SVM','PM') NOT NULL,
  jenis_data ENUM('Riset','Pengabdian') NOT NULL, tahun_pelaksanaan VARCHAR(10) NOT NULL,
  status ENUM('Menunggu Verifikasi','Perlu Revisi','Terverifikasi') NOT NULL, tanggal_pengajuan DATETIME(3) NOT NULL,
  sort_order INT UNSIGNED NOT NULL, payload JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), INDEX idx_sinta_owner (owner_id), INDEX idx_sinta_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS claim_submissions (
  id VARCHAR(100) PRIMARY KEY, tahap ENUM('Rencana Submit','Reimburse') NOT NULL DEFAULT 'Reimburse', rencana_id VARCHAR(100) NULL,
  owner_id VARCHAR(100) NULL, nama_pengaju VARCHAR(255) NOT NULL, prodi ENUM('TRL','SVM','PM') NOT NULL,
  jenis_klaim ENUM('Klaim Buku','Klaim Publikasi') NOT NULL, judul VARCHAR(500) NOT NULL, nominal DECIMAL(18,2) NULL,
  status ENUM('Menunggu','Diproses','Disetujui','Ditolak') NOT NULL, tanggal_pengajuan DATETIME(3) NOT NULL,
  sort_order INT UNSIGNED NOT NULL, payload JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_claims_owner (owner_id), INDEX idx_claims_status (status), INDEX idx_claims_tahap (tahap), INDEX idx_claims_rencana (rencana_id),
  CONSTRAINT chk_claims_nominal CHECK (nominal IS NULL OR nominal >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS monthly_research_updates (
  id VARCHAR(100) PRIMARY KEY, owner_id VARCHAR(100) NULL, dosen_id VARCHAR(100) NOT NULL, nama_dosen VARCHAR(255) NOT NULL,
  nuptk VARCHAR(50) NOT NULL, prodi ENUM('TRL','SVM','PM') NOT NULL, bulan CHAR(7) NOT NULL,
  status_laporan ENUM('Belum','Dikirim','Diterima') NOT NULL, submitted_at DATETIME(3) NOT NULL,
  sort_order INT UNSIGNED NOT NULL, payload JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_monthly_dosen_bulan (dosen_id, bulan), INDEX idx_monthly_owner (owner_id), CONSTRAINT chk_monthly_bulan CHECK (bulan REGEXP '^[0-9]{4}-[0-9]{2}$')
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(100) PRIMARY KEY, dosen_id VARCHAR(100) NOT NULL, bulan CHAR(7) NOT NULL,
  type ENUM('reminder','submission_required','overdue') NOT NULL, is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at DATETIME(3) NOT NULL,
  sort_order INT UNSIGNED NOT NULL, payload JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_notifications_dosen_read (dosen_id, is_read)
) ENGINE=InnoDB;
