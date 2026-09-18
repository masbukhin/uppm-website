import type { Prodi } from '../types';

export const PRODI_OPTIONS: Array<{ value: Prodi; label: string; shortLabel: string }> = [
  { value: 'TRL', label: 'Teknologi Rekayasa Logistik (TRL)', shortLabel: 'TRL' },
  { value: 'SVM', label: 'Survei dan Pemetaan (SVM)', shortLabel: 'SVM' },
  { value: 'PM', label: 'Perawatan Mesin (PM)', shortLabel: 'PM' },
];

export function normalizeProdi(value?: string): Prodi {
  if (value === 'TRL') return 'TRL';
  if (value === 'SVM' || value === 'TSP') return 'SVM';
  if (value === 'PM' || value === 'TPM') return 'PM';
  if (value?.toLowerCase().includes('survei')) return 'SVM';
  if (value?.toLowerCase().includes('pemetaan')) return 'SVM';
  if (value?.toLowerCase().includes('pemeliharaan')) return 'PM';
  if (value?.toLowerCase().includes('perawatan')) return 'PM';
  return 'TRL';
}

export function getProdiLabel(value?: string) {
  const normalized = normalizeProdi(value);
  return PRODI_OPTIONS.find(option => option.value === normalized)?.shortLabel || normalized;
}
