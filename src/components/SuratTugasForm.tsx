import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Download, FileDown, FileSignature, Paperclip, Printer, Save, Trash2, UserPlus } from 'lucide-react';
import { getLecturerDisplay } from '../data/lecturers';
import { useStore } from '../store/useStore';
import { AnggotaSuratTugas, Prodi, SuratTugas } from '../types';
import DocumentQr from './DocumentQr';
import { getSuratTugasSignatory } from '../services/suratTugasPolicy';

const DEFAULT_SIGNATORY = getSuratTugasSignatory('');

const formatDate = (value: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function SuratTugasForm() {
  const { currentUser, generateSuratTugasNumber, lecturerProfiles, suratTugas, addSuratTugas, deleteSuratTugas, updateSuratTugasStatus, isAdmin } = useStore();
  const defaultLecturerId = currentUser?.dosenId || lecturerProfiles[0]?.id || '';
  const [ketuaId, setKetuaId] = useState(defaultLecturerId);
  const [selectedFinalId, setSelectedFinalId] = useState<string | null>(null);
  const [selectedAnggotaId, setSelectedAnggotaId] = useState(lecturerProfiles[1]?.id || defaultLecturerId);
  const [manualAnggotaNama, setManualAnggotaNama] = useState('');
  const [manualAnggotaNuptk, setManualAnggotaNuptk] = useState('');
  const [anggota, setAnggota] = useState<AnggotaSuratTugas[]>([]);
  const [formData, setFormData] = useState<Omit<SuratTugas, 'id' | 'tanggalPengajuan' | 'status'>>({
    nomorSurat: generateSuratTugasNumber(),
    jenisKegiatan: 'Pengabdian kepada Masyarakat',
    namaKegiatan: '',
    lokasi: '',
    tanggalMulai: '',
    tanggalSelesai: '',
    ketua: lecturerProfiles.find(item => item.id === defaultLecturerId)?.nama || currentUser?.nama || '',
    ketuaNuptk: lecturerProfiles.find(item => item.id === defaultLecturerId)?.nuptk || currentUser?.nuptk || '',
    prodi: lecturerProfiles.find(item => item.id === defaultLecturerId)?.prodi || currentUser?.prodi || 'TRL',
    anggota: [],
    lampiranFileNames: [],
    qrPayload: '',
    dasarSurat: 'Dalam rangka pelaksanaan kegiatan Tri Dharma Perguruan Tinggi di lingkungan Politeknik Sinar Mas Berau Coal.',
    penandatangan: DEFAULT_SIGNATORY.name,
    jabatanPenandatangan: DEFAULT_SIGNATORY.role,
  });

  const nomorSurat = generateSuratTugasNumber(formData.tanggalMulai);

  const selectedFinal = suratTugas.find(item => item.id === selectedFinalId && item.finalDocument)?.finalDocument;

  const previewData = useMemo(() => {
    const ketua = lecturerProfiles.find(item => item.id === ketuaId);
    const signatory = getSuratTugasSignatory(formData.tanggalMulai);
    const payload = `${nomorSurat}|${formData.namaKegiatan}|${formData.tanggalMulai}|${formData.tanggalSelesai}|${ketua?.nama || formData.ketua}`;

    return {
      ...formData,
      nomorSurat,
      penandatangan: signatory.name,
      jabatanPenandatangan: signatory.role,
      ketua: ketua?.nama || formData.ketua,
      ketuaNuptk: ketua?.nuptk || formData.ketuaNuptk,
      prodi: ketua?.prodi || formData.prodi,
      anggota,
      qrPayload: payload,
    };
  }, [anggota, formData, ketuaId, nomorSurat]);

  const documentData = (selectedFinal?.snapshot as unknown as SuratTugas | undefined) || previewData;
  const isFinalDocument = Boolean(selectedFinal);
  const signatory = getSuratTugasSignatory(documentData.tanggalMulai);

  const handleKetuaChange = (id: string) => {
    const ketua = lecturerProfiles.find(item => item.id === id);
    setKetuaId(id);
    if (ketua) setFormData(prev => ({ ...prev, ketua: ketua.nama, ketuaNuptk: ketua.nuptk, prodi: ketua.prodi || prev.prodi }));
  };

  const addAnggota = () => {
    const selected = lecturerProfiles.find(item => item.id === selectedAnggotaId);
    if (!selected || anggota.some(item => item.dosenId === selected.id)) return;
    setAnggota(prev => [...prev, {
      dosenId: selected.id,
      nama: selected.nama,
      nuptk: selected.nuptk,
    }]);
  };

  const addManualAnggota = () => {
    const nama = manualAnggotaNama.trim();
    const nuptk = manualAnggotaNuptk.trim();
    if (!nama) return;

    setAnggota(prev => [...prev, {
      dosenId: `manual-${Date.now()}`,
      nama,
      nuptk,
    }]);
    setManualAnggotaNama('');
    setManualAnggotaNuptk('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addSuratTugas(previewData);
    setFormData(prev => ({ ...prev, nomorSurat: generateSuratTugasNumber(), namaKegiatan: '', lokasi: '', tanggalMulai: '', tanggalSelesai: '', lampiranFileNames: [] }));
    setAnggota([]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="no-print">
        <h2 className="text-2xl font-bold text-slate-900">{isAdmin ? 'Validasi Surat Tugas' : 'Pengajuan Surat Tugas'}</h2>
        <p className="text-slate-500 mt-1">{isAdmin ? 'Periksa seluruh pengajuan dosen, ubah status, lalu terbitkan dokumen final.' : 'Isi data kegiatan dan kirim pengajuan untuk divalidasi admin UPPM.'}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_520px] gap-8">
        <div className="no-print space-y-6">
          {!isAdmin && <div className="bg-white p-6 rounded-lg shadow-sm border border-red-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nomor Surat Otomatis</label>
                  <input readOnly value={nomorSurat} className="w-full px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg text-red-800 font-semibold" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Jenis Kegiatan</label>
                  <select value={formData.jenisKegiatan} onChange={(event) => setFormData({ ...formData, jenisKegiatan: event.target.value as SuratTugas['jenisKegiatan'] })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                    <option value="Penelitian">Penelitian</option>
                    <option value="Pengabdian kepada Masyarakat">Pengabdian kepada Masyarakat</option>
                    <option value="Survei">Survei</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nama Kegiatan</label>
                  <textarea required value={formData.namaKegiatan} onChange={(event) => setFormData({ ...formData, namaKegiatan: event.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[82px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Ketua Pelaksana</label>
                  <select value={ketuaId} onChange={(event) => handleKetuaChange(event.target.value)} disabled={!isAdmin && Boolean(currentUser?.dosenId)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-75">
                    {lecturerProfiles.map(dosen => <option key={dosen.id} value={dosen.id}>{getLecturerDisplay(dosen)}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Program Studi</label>
                  <select value={previewData.prodi} onChange={(event) => setFormData({ ...formData, prodi: event.target.value as Prodi })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                    <option value="TRL">Teknologi Rekayasa Logistik (TRL)</option>
                    <option value="SVM">Survei dan Pemetaan (SVM)</option>
                    <option value="PM">Perawatan Mesin (PM)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tanggal Mulai</label>
                  <input type="date" required value={formData.tanggalMulai} onChange={(event) => setFormData({ ...formData, tanggalMulai: event.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tanggal Selesai</label>
                  <input type="date" required value={formData.tanggalSelesai} onChange={(event) => setFormData({ ...formData, tanggalSelesai: event.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Lokasi Pelaksanaan</label>
                  <input required value={formData.lokasi} onChange={(event) => setFormData({ ...formData, lokasi: event.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Anggota Terlibat</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select value={selectedAnggotaId} onChange={(event) => setSelectedAnggotaId(event.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                      {lecturerProfiles.map(dosen => <option key={dosen.id} value={dosen.id}>{getLecturerDisplay(dosen)}</option>)}
                    </select>
                    <button type="button" onClick={addAnggota} className="px-4 py-2.5 bg-red-100 text-red-800 rounded-lg font-semibold hover:bg-red-200 flex items-center justify-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span>Tambah Dosen</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px_auto] gap-3">
                    <input value={manualAnggotaNama} onChange={(event) => setManualAnggotaNama(event.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Nama anggota manual" />
                    <input value={manualAnggotaNuptk} onChange={(event) => setManualAnggotaNuptk(event.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="NUPTK/NIP" />
                    <button type="button" onClick={addManualAnggota} className="px-4 py-2.5 bg-slate-100 text-slate-800 rounded-lg font-semibold hover:bg-slate-200 flex items-center justify-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span>Tambah Manual</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {anggota.map(item => (
                      <div key={item.dosenId} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm">
                        <span className="truncate">{item.nama} - {item.nuptk || 'NUPTK/NIP belum diisi'}</span>
                        <button type="button" onClick={() => setAnggota(prev => prev.filter(anggotaItem => anggotaItem.dosenId !== item.dosenId))} className="p-1 text-slate-400 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Lampiran Pendukung Kegiatan</label>
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" onChange={(event) => {
                    const files = Array.from(event.currentTarget.files ?? []) as File[];
                    setFormData({ ...formData, lampiranFileNames: files.map(file => file.name) });
                  }} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button type="submit" className="px-5 py-3 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 flex items-center justify-center gap-2"><Save className="w-5 h-5" /><span>Simpan Pengajuan</span></button>
              </div>
            </form>
          </div>}

          <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Riwayat Surat Tugas</h3><FileSignature className="w-5 h-5 text-red-600" /></div>
            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {suratTugas.map(item => (
                <div key={item.id} className="p-5 hover:bg-slate-50 transition-colors group">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-red-700">{item.nomorSurat}</p>
                      <h4 className="font-semibold text-slate-800 text-sm mt-1 truncate">{item.namaKegiatan}</h4>
                      <p className="text-sm text-slate-500 mt-1">{item.ketua} | {item.lokasi}</p>
                      <p className="text-xs text-slate-500 mt-1">Status: {item.status}</p>
                      {item.finalDocument && <p className="text-xs text-red-700 mt-1">Dokumen final: {item.finalDocument.number}</p>}
                    </div>
                    <div className="flex items-start gap-2">
                      {item.finalDocument && item.status === 'Disetujui' && <button onClick={() => setSelectedFinalId(item.id)} className="px-3 py-1.5 bg-red-700 text-white rounded-md text-xs font-semibold flex items-center gap-1"><Download className="w-3.5 h-3.5" />Download</button>}
                      {isAdmin && <select value={item.status} onChange={(event) => updateSuratTugasStatus(item.id, event.target.value as SuratTugas['status'])} className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1"><option>Menunggu</option><option>Diproses</option><option>Disetujui</option><option>Ditolak</option></select>}
                      <button onClick={() => deleteSuratTugas(item.id)} className="p-1.5 text-slate-300 hover:text-red-700 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {suratTugas.length === 0 && <div className="p-8 text-center text-slate-500">Belum ada pengajuan surat tugas.</div>}
            </div>
          </div>
        </div>

        <div className="print-sheet bg-white border border-slate-200 shadow-sm p-8 text-slate-900 relative overflow-hidden">
          <div className="no-print mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
            <span>{isFinalDocument ? 'Dokumen final terkunci dan siap diunduh.' : 'Preview draft. Download aktif setelah admin menyetujui pengajuan.'}</span>
            {isFinalDocument && <button onClick={() => window.print()} className="px-3 py-2 bg-red-700 text-white rounded-md font-semibold flex items-center gap-2"><Printer className="w-4 h-4" />Cetak/PDF</button>}
          </div>
          <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-4">
            <img src="/assets/logo-poltek-simas-berau.png" alt="Logo Poltek" className="w-20 h-20 object-contain" />
            <div className="text-center flex-1">
              <p className="text-sm font-bold uppercase">Politeknik Sinar Mas Berau Coal</p>
              <p className="text-xs uppercase">Unit Penelitian dan Pengabdian kepada Masyarakat</p>
              <p className="text-[11px] mt-1">Jl. Raja Alam II, Tanjung Redeb, Kabupaten Berau, Kalimantan Timur</p>
            </div>
          </div>

          {!isFinalDocument && <div className="absolute inset-x-0 top-1/2 -rotate-12 text-center text-6xl font-black text-slate-200/60 pointer-events-none">DRAFT</div>}
          <div className="mt-8 text-center"><h3 className="font-bold underline tracking-wide">SURAT TUGAS</h3><p className="text-sm mt-1">Nomor: {documentData.nomorSurat}</p></div>
          <div className="mt-8 text-sm leading-7">
            <p>{documentData.dasarSurat}</p>
            <p className="mt-4">Dengan ini menugaskan kepada:</p>
            <table className="w-full mt-3 border border-slate-800 text-sm"><thead><tr className="border-b border-slate-800"><th className="w-12 border-r border-slate-800 py-2">No</th><th className="border-r border-slate-800 py-2">Nama</th><th className="w-40 border-r border-slate-800 py-2">NUPTK/NIP</th><th className="w-32 py-2">Keterangan</th></tr></thead><tbody><tr className="border-b border-slate-800"><td className="border-r border-slate-800 text-center py-2">1</td><td className="border-r border-slate-800 px-3 py-2">{documentData.ketua || '-'}</td><td className="border-r border-slate-800 px-3 py-2 text-center">{documentData.ketuaNuptk || '-'}</td><td className="text-center py-2">Ketua</td></tr>{documentData.anggota.map((item, index) => <tr key={`${item.nama}-${index}`} className="border-b border-slate-800 last:border-b-0"><td className="border-r border-slate-800 text-center py-2">{index + 2}</td><td className="border-r border-slate-800 px-3 py-2">{item.nama}</td><td className="border-r border-slate-800 px-3 py-2 text-center">{item.nuptk || '-'}</td><td className="text-center py-2">Anggota</td></tr>)}</tbody></table>
            <p className="mt-5">Untuk melaksanakan kegiatan <strong>{documentData.namaKegiatan || '-'}</strong> yang dilaksanakan pada:</p>
            <table className="mt-3 text-sm"><tbody><tr><td className="w-32 py-1">Tanggal</td><td className="w-4">:</td><td>{formatDate(documentData.tanggalMulai)} sampai {formatDate(documentData.tanggalSelesai)}</td></tr><tr><td className="py-1">Tempat</td><td>:</td><td>{documentData.lokasi || '-'}</td></tr><tr><td className="py-1">Program Studi</td><td>:</td><td>{documentData.prodi}</td></tr></tbody></table>
            {documentData.lampiranFileNames.length > 0 && <div className="mt-4"><p className="font-semibold flex items-center gap-2"><Paperclip className="w-4 h-4" />Lampiran:</p><ol className="list-decimal pl-5">{documentData.lampiranFileNames.map(file => <li key={file}>{file}</li>)}</ol></div>}
            <p className="mt-5">Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab dan dipergunakan sebagaimana mestinya.</p>
          </div>

          <div className="mt-10 flex justify-between items-end text-sm">
            <div className="space-y-2">
              <DocumentQr documentId={selectedFinal?.id} />
              <p className="text-[10px] leading-tight max-w-32 break-all">ID: {selectedFinal?.id || 'draft'}</p>
            </div>
            <div className="w-72 text-center relative pt-1">
              <p>Tanjung Redeb, {formatDate(documentData.tanggalMulai)}</p><p>{signatory.role}</p>
              {isFinalDocument && signatory.combinedImage ? (
                <img src={signatory.image} alt={`Tanda tangan, stempel UPPM, dan nama ${signatory.name}`} className="mx-auto mt-3 w-48 h-auto object-contain mix-blend-multiply" />
              ) : (
                <>
                  {isFinalDocument && <img src="/assets/stempel-uppm.png" alt="Stempel UPPM" className="absolute left-6 top-16 w-28 h-28 object-contain opacity-80 mix-blend-multiply" />}
                  {isFinalDocument && <img src={signatory.image} alt={`Tanda tangan ${signatory.name}`} className="absolute left-1/2 -translate-x-1/2 top-14 w-44 h-24 object-contain mix-blend-multiply" />}
                  <div className="h-36" />
                  <p className="font-bold underline relative">{signatory.name}</p>
                  <p className="relative">NUPTK. {signatory.nuptk}</p>
                </>
              )}
            </div>
          </div>
          <div className="no-print mt-6 flex items-center gap-2 text-xs text-slate-500"><FileDown className="w-4 h-4" /><span>Dokumen final tersimpan saat admin menyetujui. Gunakan Cetak/PDF untuk mengunduh.</span></div>
        </div>
      </div>
    </motion.div>
  );
}
