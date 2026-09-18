import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookMarked, Download, FileCheck2, Printer, ReceiptText, Save, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ClaimSubmission, Prodi, StoredAttachment } from '../types';

const formatDate = (value: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

function makeQrCells(value: string) {
  let seed = 0;
  for (let index = 0; index < value.length; index += 1) seed = (seed * 31 + value.charCodeAt(index)) % 9973;
  return Array.from({ length: 81 }, (_, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const finder = (row < 3 && col < 3) || (row < 3 && col > 5) || (row > 5 && col < 3);
    return finder || ((seed + row * 13 + col * 19 + row * col) % 4 < 2);
  });
}

function QrSeal({ payload }: { payload: string }) {
  const cells = makeQrCells(payload);
  return <div className="barcode-box w-20 h-20 grid grid-cols-9 border-4 border-white bg-white shadow-sm">{cells.map((filled, index) => <span key={index} className={filled ? 'barcode-cell bg-slate-900' : 'bg-white'} />)}</div>;
}

function readAttachment(file: File, label: string): Promise<StoredAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ label, fileName: file.name, mimeType: file.type, dataUrl: String(reader.result) });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AttachmentPreview({ attachment }: { attachment: StoredAttachment }) {
  if (attachment.mimeType.startsWith('image/')) {
    return <img src={attachment.dataUrl} alt={attachment.fileName} className="mt-3 max-h-[520px] w-full object-contain border border-slate-200" />;
  }

  if (attachment.mimeType === 'application/pdf') {
    return <iframe title={attachment.fileName} src={attachment.dataUrl} className="mt-3 h-[520px] w-full border border-slate-200" />;
  }

  return <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">File tersimpan: {attachment.fileName}</div>;
}

function downloadAttachment(attachment: StoredAttachment) {
  const link = document.createElement('a');
  link.href = attachment.dataUrl;
  link.download = attachment.fileName;
  link.click();
}

function downloadAttachments(attachments: StoredAttachment[]) {
  attachments.forEach((attachment, index) => {
    window.setTimeout(() => downloadAttachment(attachment), index * 250);
  });
}

export default function ClaimSubmissionForm() {
  const { currentUser, isAdmin, claimSubmissions, addClaimSubmission, deleteClaimSubmission, updateClaimStatus } = useStore();
  const [selectedFinalId, setSelectedFinalId] = useState<string | null>(null);
  const selectedClaim = claimSubmissions.find(item => item.id === selectedFinalId && item.finalDocument);
  const selectedSnapshot = selectedClaim?.finalDocument?.snapshot as unknown as ClaimSubmission | undefined;
  const selectedAttachments = selectedSnapshot?.attachments || [];
  const [formData, setFormData] = useState<Omit<ClaimSubmission, 'id' | 'tanggalPengajuan' | 'status'>>({
    namaPengaju: currentUser?.nama || '',
    prodi: currentUser?.prodi || 'TRL',
    jenisKlaim: 'Klaim Publikasi',
    judul: '',
    tanggalPelaksanaan: '',
    buktiKaryaFileName: '',
    buktiTransferFileName: '',
    rekeningSinarmasFileName: '',
    attachments: [],
    nominal: 0,
    catatan: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addClaimSubmission(formData);
    setFormData({
      namaPengaju: currentUser?.nama || '',
      prodi: currentUser?.prodi || 'TRL',
      jenisKlaim: 'Klaim Publikasi',
      judul: '',
      tanggalPelaksanaan: '',
      buktiKaryaFileName: '',
      buktiTransferFileName: '',
      rekeningSinarmasFileName: '',
      attachments: [],
      nominal: 0,
      catatan: ''
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Klaim Buku dan Publikasi</h2>
        <p className="text-slate-500 mt-1">Ajukan klaim insentif dengan bukti karya, bukti transfer, dan tanggal pelaksanaan.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nama Pengaju</label>
                <input
                  required
                  value={formData.namaPengaju}
                  onChange={(e) => setFormData({ ...formData, namaPengaju: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Nama lengkap beserta gelar"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Program Studi</label>
                <select
                  value={formData.prodi}
                  onChange={(e) => setFormData({ ...formData, prodi: e.target.value as Prodi })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="TRL">Teknologi Rekayasa Logistik (TRL)</option>
                  <option value="SVM">Survei dan Pemetaan (SVM)</option>
                  <option value="PM">Perawatan Mesin (PM)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Jenis Klaim</label>
                <select
                  value={formData.jenisKlaim}
                  onChange={(e) => setFormData({ ...formData, jenisKlaim: e.target.value as ClaimSubmission['jenisKlaim'] })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="Klaim Publikasi">Klaim Publikasi</option>
                  <option value="Klaim Buku">Klaim Buku</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  required
                  value={formData.tanggalPelaksanaan}
                  onChange={(e) => setFormData({ ...formData, tanggalPelaksanaan: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700">Judul Buku atau Publikasi</label>
                <textarea
                  required
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[82px]"
                  placeholder="Judul artikel, buku, chapter, atau prosiding"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Bukti Publikasi atau Buku</label>
                <input
                  type="file"
                  required={!formData.buktiKaryaFileName}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const attachment = await readAttachment(file, 'Bukti Publikasi/Buku');
                      setFormData(prev => ({ ...prev, buktiKaryaFileName: file.name, attachments: [...(prev.attachments || []).filter(item => item.label !== attachment.label), attachment] }));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700"
                />
                {formData.buktiKaryaFileName && <p className="text-xs text-slate-500">{formData.buktiKaryaFileName}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Bukti Transfer</label>
                <input
                  type="file"
                  required={!formData.buktiTransferFileName}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const attachment = await readAttachment(file, 'Bukti Transfer');
                      setFormData(prev => ({ ...prev, buktiTransferFileName: file.name, attachments: [...(prev.attachments || []).filter(item => item.label !== attachment.label), attachment] }));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700"
                />
                {formData.buktiTransferFileName && <p className="text-xs text-slate-500">{formData.buktiTransferFileName}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">List Nomor Rekening Sinarmas</label>
                <input
                  type="file"
                  required={!formData.rekeningSinarmasFileName}
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const attachment = await readAttachment(file, 'List Nomor Rekening Sinarmas');
                      setFormData(prev => ({ ...prev, rekeningSinarmasFileName: file.name, attachments: [...(prev.attachments || []).filter(item => item.label !== attachment.label), attachment] }));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700"
                />
                {formData.rekeningSinarmasFileName && <p className="text-xs text-slate-500">{formData.rekeningSinarmasFileName}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nominal Klaim (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.nominal}
                  onChange={(e) => setFormData({ ...formData, nominal: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Catatan</label>
                <input
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Opsional"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span>Ajukan Klaim</span>
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
              <BookMarked className="w-6 h-6 text-red-600 mb-3" />
              <p className="text-sm text-slate-500">Klaim Buku</p>
              <p className="text-2xl font-bold text-slate-800">{claimSubmissions.filter(item => item.jenisKlaim === 'Klaim Buku').length}</p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
              <ReceiptText className="w-6 h-6 text-red-600 mb-3" />
              <p className="text-sm text-slate-500">Klaim Publikasi</p>
              <p className="text-2xl font-bold text-slate-800">{claimSubmissions.filter(item => item.jenisKlaim === 'Klaim Publikasi').length}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Riwayat Klaim</h3>
              <FileCheck2 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {claimSubmissions.map((item) => (
                <div key={item.id} className="p-5 hover:bg-slate-50 transition-colors group">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700">
                        {item.jenisKlaim}
                      </span>
                      <h4 className="font-semibold text-slate-800 text-sm mt-3 line-clamp-2">{item.judul}</h4>
                      <p className="text-sm text-slate-500 mt-1">{item.namaPengaju} | {item.prodi}</p>
                      <p className="text-xs text-slate-500 mt-2">Status: {item.status}</p>
                      {item.finalDocument && <p className="text-xs text-red-700 mt-1">Dokumen final: {item.finalDocument.number}</p>}
                    </div>
                    <div className="flex items-start gap-2">
                      {item.finalDocument && item.status === 'Disetujui' && <button onClick={() => setSelectedFinalId(item.id)} className="px-3 py-1.5 bg-red-700 text-white rounded-md text-xs font-semibold flex items-center gap-1"><Download className="w-3.5 h-3.5" />Rekap</button>}
                      {isAdmin && <select value={item.status} onChange={(event) => updateClaimStatus(item.id, event.target.value as ClaimSubmission['status'])} className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1"><option>Menunggu</option><option>Diproses</option><option>Disetujui</option><option>Ditolak</option></select>}
                      <button onClick={() => deleteClaimSubmission(item.id)} className="self-start p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {claimSubmissions.length === 0 && (
                <div className="p-8 text-center text-slate-500">Belum ada klaim buku atau publikasi.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedClaim?.finalDocument && selectedSnapshot && (
        <div className="print-sheet bg-white border border-slate-200 shadow-sm p-8 text-slate-900 relative overflow-hidden">
          <div className="no-print mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
            <span>Rekap dan 3 lampiran klaim final siap diunduh.</span>
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => downloadAttachments(selectedAttachments)} disabled={selectedAttachments.length === 0} className="px-3 py-2 bg-white text-red-700 border border-red-200 rounded-md font-semibold flex items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" />Download 3 Lampiran</button>
              <button onClick={() => window.print()} className="px-3 py-2 bg-red-700 text-white rounded-md font-semibold flex items-center gap-2"><Printer className="w-4 h-4" />Rekap PDF</button>
            </div>
          </div>
          <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-4">
            <img src="/assets/logo-poltek-simas-berau.png" alt="Logo Poltek" className="w-20 h-20 object-contain" />
            <div className="text-center flex-1">
              <p className="text-sm font-bold uppercase">Politeknik Sinar Mas Berau Coal</p>
              <p className="text-xs uppercase">Unit Penelitian dan Pengabdian kepada Masyarakat</p>
              <p className="text-[11px] mt-1">Jl. Raja Alam II, Tanjung Redeb, Kabupaten Berau, Kalimantan Timur</p>
            </div>
          </div>
          <div className="mt-8 text-center"><h3 className="font-bold underline tracking-wide">BUNDEL LAMPIRAN KLAIM DANA</h3><p className="text-sm mt-1">Nomor: {selectedClaim.finalDocument.number}</p></div>
          <div className="mt-8 text-sm leading-7">
            <p>Dengan ini UPPM Politeknik Sinar Mas Berau Coal menyatakan bahwa pengajuan klaim berikut telah diproses oleh admin.</p>
            <table className="mt-5 w-full text-sm"><tbody>
              <tr><td className="w-44 py-1">Nama Pengaju</td><td className="w-4">:</td><td>{selectedSnapshot.namaPengaju}</td></tr>
              <tr><td className="py-1">Program Studi</td><td>:</td><td>{selectedSnapshot.prodi}</td></tr>
              <tr><td className="py-1">Jenis Klaim</td><td>:</td><td>{selectedSnapshot.jenisKlaim}</td></tr>
              <tr><td className="py-1">Judul</td><td>:</td><td>{selectedSnapshot.judul}</td></tr>
              <tr><td className="py-1">Tanggal Pelaksanaan</td><td>:</td><td>{formatDate(selectedSnapshot.tanggalPelaksanaan)}</td></tr>
              <tr><td className="py-1">Nominal</td><td>:</td><td>Rp {Number(selectedSnapshot.nominal || 0).toLocaleString('id-ID')}</td></tr>
              <tr><td className="py-1">Status</td><td>:</td><td>{selectedClaim.status}</td></tr>
            </tbody></table>
            <p className="mt-5">Rekap ini melampirkan bukti publikasi/buku, bukti transfer, dan list nomor rekening Sinarmas. Gunakan tombol Download 3 Lampiran untuk mengambil file asli yang akan diajukan ke keuangan.</p>
            <div className="no-print mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-bold text-slate-900">File asli untuk keuangan</h4>
              <div className="mt-3 space-y-2">
                {selectedAttachments.map((attachment) => (
                  <div key={`${attachment.label}-${attachment.fileName}`} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{attachment.label}</p>
                      <p className="truncate text-xs text-slate-500">{attachment.fileName}</p>
                    </div>
                    <button onClick={() => downloadAttachment(attachment)} className="shrink-0 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white">Download</button>
                  </div>
                ))}
                {selectedAttachments.length === 0 && <p className="text-sm text-slate-500">Lampiran asli belum tersimpan pada pengajuan ini. Upload ulang pengajuan klaim agar file dapat diunduh kembali.</p>}
              </div>
            </div>
            <div className="mt-6 space-y-8">
              {selectedAttachments.map((attachment, index) => (
                <section key={`${attachment.label}-${attachment.fileName}`} className="break-inside-avoid border-t border-slate-200 pt-5">
                  <h4 className="font-bold text-slate-900">Lampiran {index + 1}: {attachment.label}</h4>
                  <p className="text-xs text-slate-500">{attachment.fileName}</p>
                  <AttachmentPreview attachment={attachment} />
                </section>
              ))}
            </div>
          </div>
          <div className="mt-10 flex justify-between items-end text-sm">
            <div className="space-y-2">
              <QrSeal payload={selectedClaim.finalDocument.barcodePayload} />
              <p className="text-[10px] leading-tight max-w-32 break-all">ID: {selectedClaim.finalDocument.id}</p>
            </div>
            <div className="w-72 text-center relative pt-1">
              <p>Tanjung Redeb, {formatDate(selectedClaim.finalDocument.approvedAt)}</p><p>Kepala UPPM</p>
              <img src="/assets/stempel-uppm.png" alt="Stempel UPPM" className="absolute left-6 top-12 w-28 h-28 object-contain opacity-80 mix-blend-multiply" />
              <img src="/assets/ttd-pimpinan.png" alt="Tanda tangan" className="absolute left-1/2 -translate-x-1/2 top-8 w-44 h-24 object-contain mix-blend-multiply" />
              <div className="h-28" /><p className="font-bold underline relative">Kepala UPPM</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
