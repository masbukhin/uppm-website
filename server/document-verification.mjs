import { normalizeSuratTugas } from './surat-tugas-policy.mjs';

const SOURCES = [
  { key: 'suratTugas', validStatus: 'Disetujui' },
  { key: 'claimSubmissions', validStatus: 'Disetujui' },
  { key: 'sintaVerifications', validStatus: 'Terverifikasi' },
];

export function findVerifiedDocument(payload, documentId) {
  if (!/^doc-[A-Za-z0-9-]{8,140}$/.test(documentId || '')) return null;

  for (const source of SOURCES) {
    const storedRecord = (payload[source.key] || []).find(item => item.finalDocument?.id === documentId);
    if (!storedRecord || storedRecord.status !== source.validStatus) continue;
    const record = source.key === 'suratTugas' ? normalizeSuratTugas(storedRecord) : storedRecord;
    const finalDocument = record.finalDocument;
    const snapshot = finalDocument.snapshot || {};
    return {
      id: finalDocument.id,
      type: finalDocument.type,
      title: finalDocument.title,
      number: finalDocument.number,
      approvedAt: finalDocument.approvedAt,
      approvedBy: finalDocument.approvedBy,
      subjectName: snapshot.ketua || snapshot.namaPengaju || record.ownerName || undefined,
      prodi: snapshot.prodi || record.prodi || undefined,
    };
  }
  return null;
}
