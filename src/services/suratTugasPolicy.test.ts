import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSuratTugasNumber, getSuratTugasPeriod, getSuratTugasSignatory } from './suratTugasPolicy';

test('kegiatan sebelum Mei 2026 memakai gambar lengkap Renal Fajri', () => {
  for (const date of ['2025-12-12', '2026-04-30']) {
    const signatory = getSuratTugasSignatory(date);
    assert.equal(signatory.name, 'Renal Fajri, S.T., M.T.');
    assert.equal(signatory.image, '/assets/ttd-renal-fajri.png');
    assert.equal(signatory.combinedImage, true);
  }
});

test('mulai 1 Mei 2026 memakai Muhammad Masbukhin', () => {
  for (const date of ['2026-05-01', '2026-05-12', '2027-01-01']) {
    const signatory = getSuratTugasSignatory(date);
    assert.equal(signatory.name, 'Muhammad Masbukhin, S.Tr.T., M.T.');
    assert.equal(signatory.combinedImage, false);
  }
});

test('bulan dan tahun nomor surat mengikuti awal kegiatan, dengan urutan per tahun', () => {
  const records = [
    { nomorSurat: '007/UPPM/ST/01/2025' },
    { nomorSurat: '055/UPPM/ST/06/2026' },
    { nomorSurat: '999/UPPM/ST/10/2027' },
  ];
  assert.equal(createSuratTugasNumber(records, '2025-12-12'), '008/UPPM/ST/12/2025');
  assert.equal(createSuratTugasNumber(records, '2026-04-12'), '056/UPPM/ST/04/2026');
  assert.equal(createSuratTugasNumber([], '2026-05-12'), '050/UPPM/ST/05/2026');
  assert.equal(createSuratTugasNumber([], '2024-12-12'), '001/UPPM/ST/12/2024');
  assert.deepEqual(getSuratTugasPeriod('2025-12-12'), { month: '12', year: 2025 });
});
