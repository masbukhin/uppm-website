import type { DosenProfile, Prodi } from '../types';
import dosenCsv from './dosen.csv?raw';
import { normalizeProdi } from './prodi';

const prodiMap: Record<string, Prodi> = {
  'D-IV Teknologi Rekayasa Logistik': 'TRL',
  'D-IV Teknologi Survei dan Pemetaan': 'SVM',
  'D-IV Teknologi Pemeliharaan Mesin': 'PM',
  'Teknologi Rekayasa Logistik': 'TRL',
  'Teknologi Survei dan Pemetaan': 'SVM',
  'Teknologi Pemeliharaan Mesin': 'PM',
};

function toId(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseProdi(value: string): Prodi {
  return prodiMap[value.trim()] || normalizeProdi(value);
}

export const lecturerProfiles: DosenProfile[] = dosenCsv
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('Search:') && !line.startsWith(';;;'))
  .slice(1)
  .map(line => {
    const [no, nama, nuptk, jabatanFungsional, prodiLengkap] = line.split(';').map(part => part.trim());

    return {
      id: `${no || toId(nama)}-${toId(nama)}`,
      nama,
      nuptk,
      jabatanFungsional: jabatanFungsional || '-',
      prodi: parseProdi(prodiLengkap),
      prodiLengkap,
    };
  })
  .filter(dosen => dosen.nama && dosen.nuptk);

export function findLecturerById(id?: string) {
  return lecturerProfiles.find(dosen => dosen.id === id);
}

export function getLecturerDisplay(dosen: DosenProfile) {
  return `${dosen.nama} - ${dosen.nuptk}`;
}
