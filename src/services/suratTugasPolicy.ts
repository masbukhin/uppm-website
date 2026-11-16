import { normalizeSuratTugas as normalizeRecord } from '../../server/surat-tugas-policy.mjs';
import type { SuratTugas } from '../types';

export { getSuratTugasSignatory } from '../../server/surat-tugas-policy.mjs';

export function normalizeSuratTugas<T extends SuratTugas>(record: T): T {
  return normalizeRecord(record) as T;
}

export function getSuratTugasPeriod(tanggalMulai: string) {
  if (tanggalMulai) return { year: Number(tanggalMulai.slice(0, 4)), month: tanggalMulai.slice(5, 7) };
  const today = new Date();
  return { year: today.getFullYear(), month: String(today.getMonth() + 1).padStart(2, '0') };
}

export function createSuratTugasNumber(records: { nomorSurat: string }[], tanggalMulai = '') {
  const { year, month } = getSuratTugasPeriod(tanggalMulai);
  const highest = records.reduce((sequence, item) => {
    if (!item.nomorSurat?.endsWith(`/${year}`)) return sequence;
    const value = Number.parseInt(item.nomorSurat.split('/')[0], 10);
    return Number.isFinite(value) ? Math.max(sequence, value) : sequence;
  }, year === 2026 ? 49 : 0);
  return `${String(highest + 1).padStart(3, '0')}/UPPM/ST/${month}/${year}`;
}
