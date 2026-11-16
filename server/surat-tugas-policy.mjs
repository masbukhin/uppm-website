export function getSuratTugasSignatory(tanggalMulai) {
  const previous = Boolean(tanggalMulai && tanggalMulai < '2026-05-01');
  return previous
    ? { name: 'Renal Fajri, S.T., M.T.', nuptk: '3759772673130352', role: 'Ketua UPPM', image: '/assets/ttd-renal-fajri.png', combinedImage: true }
    : { name: 'Muhammad Masbukhin, S.Tr.T., M.T.', nuptk: '0361776677130173', role: 'Ketua LPPM', image: '/assets/ttd-pimpinan.png', combinedImage: false };
}

function normalizeDetails(details, fallback = {}) {
  const tanggalMulai = details.tanggalMulai || fallback.tanggalMulai;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalMulai || '')) return details;
  const signatory = getSuratTugasSignatory(tanggalMulai);
  const nomorSurat = details.nomorSurat || fallback.nomorSurat || '';
  return {
    ...details,
    tanggalMulai,
    nomorSurat: nomorSurat.replace(/\/UPPM\/ST\/\d{2}\/\d{4}$/, `/UPPM/ST/${tanggalMulai.slice(5, 7)}/${tanggalMulai.slice(0, 4)}`),
    penandatangan: signatory.name,
    jabatanPenandatangan: signatory.role,
  };
}

// Apply the same policy to stored final snapshots and their parent records.
// Keep the document ID, QR URL, approval audit, and sequence prefix intact.
export function normalizeSuratTugas(record) {
  const normalized = normalizeDetails(record);
  if (!record.finalDocument) return normalized;
  const snapshot = normalizeDetails(record.finalDocument.snapshot || {}, record);
  return {
    ...normalized,
    nomorSurat: snapshot.nomorSurat || normalized.nomorSurat,
    penandatangan: snapshot.penandatangan || normalized.penandatangan,
    jabatanPenandatangan: snapshot.jabatanPenandatangan || normalized.jabatanPenandatangan,
    finalDocument: {
      ...record.finalDocument,
      number: snapshot.nomorSurat || record.finalDocument.number,
      snapshot,
    },
  };
}
