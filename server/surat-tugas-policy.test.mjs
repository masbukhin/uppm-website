import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeSuratTugas } from './surat-tugas-policy.mjs';
import { findVerifiedDocument } from './document-verification.mjs';

const approved = {
  id: 'legacy-task', status: 'Disetujui',
  nomorSurat: '051/UPPM/ST/10/2026', tanggalMulai: '2025-04-12', tanggalSelesai: '2025-04-20',
  penandatangan: 'Muhammad Masbukhin, S.Tr.T., M.T.', jabatanPenandatangan: 'Ketua LPPM',
  finalDocument: {
    id: 'doc-surat-tugas-123456789', type: 'surat-tugas', number: '051/UPPM/ST/10/2026',
    approvedAt: '2026-10-06T00:00:00Z', approvedBy: 'Admin', barcodePayload: '/verify?id=doc-surat-tugas-123456789',
    snapshot: {
      nomorSurat: '051/UPPM/ST/10/2026', tanggalMulai: '2025-04-12', tanggalSelesai: '2025-04-20',
      penandatangan: 'Muhammad Masbukhin, S.Tr.T., M.T.', jabatanPenandatangan: 'Ketua LPPM',
    },
  },
};

test('surat yang sudah disetujui diperbaiki sampai snapshot final tanpa persetujuan ulang', () => {
  const result = normalizeSuratTugas(approved);
  assert.equal(result.nomorSurat, '051/UPPM/ST/04/2025');
  assert.equal(result.finalDocument.number, result.nomorSurat);
  assert.equal(result.finalDocument.snapshot.nomorSurat, result.nomorSurat);
  assert.equal(result.finalDocument.snapshot.penandatangan, 'Renal Fajri, S.T., M.T.');
  assert.equal(result.finalDocument.snapshot.tanggalMulai, '2025-04-12');
  assert.equal(result.finalDocument.snapshot.tanggalSelesai, '2025-04-20');
  for (const field of ['id', 'approvedAt', 'approvedBy', 'barcodePayload']) {
    assert.equal(result.finalDocument[field], approved.finalDocument[field]);
  }
  assert.equal(approved.finalDocument.number, '051/UPPM/ST/10/2026');
  assert.deepEqual(normalizeSuratTugas(result), result);
});

test('hasil verifikasi QR konsisten dengan nomor surat final yang diperbaiki', () => {
  const result = findVerifiedDocument({ suratTugas: [approved] }, approved.finalDocument.id);
  assert.equal(result.number, '051/UPPM/ST/04/2025');
  assert.equal(result.approvedAt, approved.finalDocument.approvedAt);
  assert.equal(findVerifiedDocument({ suratTugas: [{ ...approved, status: 'Ditolak' }] }, approved.finalDocument.id), null);
});

test('snapshot kegiatan mulai Mei memakai Muhammad Masbukhin dan tanggal snapshot', () => {
  const result = normalizeSuratTugas({
    ...approved,
    finalDocument: { ...approved.finalDocument, snapshot: { ...approved.finalDocument.snapshot, tanggalMulai: '2026-05-12' } },
  });
  assert.equal(result.finalDocument.number, '051/UPPM/ST/05/2026');
  assert.equal(result.finalDocument.snapshot.penandatangan, 'Muhammad Masbukhin, S.Tr.T., M.T.');
});
