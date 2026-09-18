export const sintaResearchColumns = [
  'No',
  'sinta_id_ketua',
  'nama_ketua',
  'nidn_ketua',
  'afiliasi_ketua',
  'kd_pt_ketua',
  'judul',
  'nama_singkat_skema',
  'thn_pertama_usulan',
  'thn_usulan_kegiatan',
  'thn_pelaksanaan_kegiatan',
  'lama_kegiatan(tahun)',
  'bidang_fokus',
  'nama_skema',
  'status_usulan (hanya didanai)',
  'dana_disetujui',
  'afiliasi_sinta_id',
  'nama_institusi_penerima_dana',
  'target_tkt',
  'nama_program_hibah',
  'kategori_sumber_dana',
  'negara_sumber_dana',
  'sumber_dana',
  'sinta_id_member1',
  'nidn_member1',
  'nama_member1',
  'sinta_id_member2',
  'nidn_member_sinta2',
  'nama_member_sinta2',
  'sinta_id_member3',
  'nidn_member_sinta3',
  'nama_member_sinta3',
  'sinta_id_member4',
  'nidn_member_sinta4',
  'nama_member_sinta4',
  'sinta_id_member5',
  'nidn_member_sinta5',
  'nama_member_sinta5',
] as const;

export const sintaRequiredColumns = [
  'sinta_id_ketua',
  'nama_ketua',
  'nidn_ketua',
  'judul',
  'nama_singkat_skema',
  'thn_pelaksanaan_kegiatan',
  'lama_kegiatan(tahun)',
  'status_usulan (hanya didanai)',
  'dana_disetujui',
  'sumber_dana',
] as const;

export function createEmptySintaFields() {
  return Object.fromEntries(sintaResearchColumns.map(column => [column, ''])) as Record<string, string>;
}

export function toSintaCsvRows(records: Array<Record<string, string>>) {
  const escapeCsv = (value: string) => {
    const normalized = value.replace(/\r?\n/g, ' ').trim();
    return /[",;]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
  };

  const header = sintaResearchColumns.join(';');
  const rows = records.map(record => sintaResearchColumns.map(column => escapeCsv(record[column] || '')).join(';'));

  return [header, ...rows].join('\n');
}

export function toSintaExcelHtml(records: Array<Record<string, string>>) {
  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const header = sintaResearchColumns.map(column => `<th>${escapeHtml(column)}</th>`).join('');
  const body = records.map(record => (
    `<tr>${sintaResearchColumns.map(column => `<td style="mso-number-format:'\\@';">${escapeHtml(record[column] || '')}</td>`).join('')}</tr>`
  )).join('');

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" /></head>
<body><table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body>
</html>`;
}

export function downloadSintaExcel(fields: Record<string, string>, fileName = `upload-research-sinta-${Date.now()}.xls`) {
  const content = toSintaExcelHtml([fields]);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
