import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Download, FileSpreadsheet, Save, Trash2 } from 'lucide-react';
import { createEmptySintaFields, downloadSintaExcel, sintaRequiredColumns, sintaResearchColumns, toSintaCsvRows } from '../data/sintaTemplate';
import { getLecturerDisplay } from '../data/lecturers';
import { useStore } from '../store/useStore';
import { Prodi, SintaVerification } from '../types';

const memberSlots = [1, 2, 3, 4, 5] as const;

export default function SintaVerificationForm() {
  const { currentUser, isAdmin, lecturerProfiles, sintaVerifications, addSintaVerification, deleteSintaVerification, updateSintaVerificationStatus } = useStore();
  const defaultLecturerId = currentUser?.dosenId || lecturerProfiles[0]?.id || '';
  const [ketuaId, setKetuaId] = useState(defaultLecturerId);
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial = createEmptySintaFields();
    const lecturer = lecturerProfiles.find(item => item.id === defaultLecturerId);
    initial.No = '1';
    initial.afiliasi_ketua = 'Politeknik Sinar Mas Berau Coal';
    initial.kd_pt_ketua = '115018';
    initial.nama_institusi_penerima_dana = 'Politeknik Sinar Mas Berau Coal';
    initial.status_usulan = 'didanai';
    initial['status_usulan (hanya didanai)'] = 'didanai';
    initial.kategori_sumber_dana = 'Mandiri';
    initial.negara_sumber_dana = 'Indonesia';
    initial.sumber_dana = 'Pribadi';
    initial['lama_kegiatan(tahun)'] = '1';
    initial.thn_pertama_usulan = new Date().getFullYear().toString();
    initial.thn_usulan_kegiatan = new Date().getFullYear().toString();
    initial.thn_pelaksanaan_kegiatan = new Date().getFullYear().toString();
    if (lecturer) {
      initial.nama_ketua = lecturer.nama;
      initial.nidn_ketua = lecturer.nuptk;
    }
    return initial;
  });
  const [formMeta, setFormMeta] = useState({
    namaPengaju: currentUser?.nama || '',
    prodi: currentUser?.prodi || 'TRL' as Prodi,
    jenisData: 'Riset' as SintaVerification['jenisData'],
    tahunPelaksanaan: new Date().getFullYear().toString(),
    catatan: '',
  });

  const filledRequired = useMemo(() => sintaRequiredColumns.filter(column => fields[column]?.trim()).length, [fields]);

  const setField = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const applyLecturer = (slot: 'ketua' | number, id: string) => {
    const lecturer = lecturerProfiles.find(item => item.id === id);
    if (!lecturer) return;

    if (slot === 'ketua') {
      setKetuaId(id);
      setFields(prev => ({ ...prev, nama_ketua: lecturer.nama, nidn_ketua: lecturer.nuptk }));
      setFormMeta(prev => ({ ...prev, namaPengaju: lecturer.nama, prodi: lecturer.prodi || currentUser?.prodi || 'TRL' }));
      return;
    }

    const sintaKey = slot === 1 ? 'sinta_id_member1' : `sinta_id_member${slot}`;
    const nidnKey = slot === 1 ? 'nidn_member1' : `nidn_member_sinta${slot}`;
    const namaKey = slot === 1 ? 'nama_member1' : `nama_member_sinta${slot}`;
    setFields(prev => ({ ...prev, [sintaKey]: '', [nidnKey]: lecturer.nuptk, [namaKey]: lecturer.nama }));
  };

  const handleDownloadCsv = () => {
    const csv = toSintaCsvRows([fields]);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `upload-research-sinta-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addSintaVerification({
      ...formMeta,
      tahunPelaksanaan: fields.thn_pelaksanaan_kegiatan || formMeta.tahunPelaksanaan,
      fields,
      fileName: 'Input manual sesuai template Upload_research',
    });
    setFields(prev => ({ ...createEmptySintaFields(), No: String(Number(prev.No || 0) + 1), thn_pelaksanaan_kegiatan: prev.thn_pelaksanaan_kegiatan }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{isAdmin ? 'Validasi Data SINTA' : 'Pengajuan Data SINTA'}</h2>
        <p className="text-slate-500 mt-1">{isAdmin ? 'Periksa pengajuan SINTA dosen dan tetapkan hasil verifikasi.' : 'Isi setiap kolom sesuai template Upload_research untuk dikirim kepada admin.'}</p>
      </div>

      <div className={`grid grid-cols-1 gap-8 ${isAdmin ? '' : 'xl:grid-cols-[minmax(0,1fr)_420px]'}`}>
        {!isAdmin && <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-red-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Ketua dari Daftar Dosen</label>
              <select value={ketuaId} onChange={(event) => applyLecturer('ketua', event.target.value)} disabled={!isAdmin && Boolean(currentUser?.dosenId)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-75">
                {lecturerProfiles.map(dosen => <option key={dosen.id} value={dosen.id}>{getLecturerDisplay(dosen)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Jenis Data</label>
              <select value={formMeta.jenisData} onChange={(event) => setFormMeta({ ...formMeta, jenisData: event.target.value as SintaVerification['jenisData'] })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                <option value="Riset">Riset</option>
                <option value="Pengabdian">Pengabdian</option>
              </select>
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="font-bold text-slate-900">Identitas dan Kegiatan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sintaResearchColumns.slice(0, 23).map(column => (
                <div key={column} className={column === 'judul' ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
                  <label className="text-sm font-semibold text-slate-700">{column}</label>
                  {column === 'judul' ? (
                    <textarea required={sintaRequiredColumns.includes(column as any)} value={fields[column] || ''} onChange={(event) => setField(column, event.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[82px]" />
                  ) : (
                    <input required={sintaRequiredColumns.includes(column as any)} value={fields[column] || ''} onChange={(event) => setField(column, event.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-bold text-slate-900">Anggota 1-5</h3>
            <div className="space-y-5">
              {memberSlots.map(slot => {
                const sintaKey = slot === 1 ? 'sinta_id_member1' : `sinta_id_member${slot}`;
                const nidnKey = slot === 1 ? 'nidn_member1' : `nidn_member_sinta${slot}`;
                const namaKey = slot === 1 ? 'nama_member1' : `nama_member_sinta${slot}`;
                return (
                  <div key={slot} className="border border-slate-100 rounded-lg p-4 space-y-3">
                    <label className="text-sm font-semibold text-slate-700">Pilih Anggota {slot}</label>
                    <select onChange={(event) => applyLecturer(slot, event.target.value)} defaultValue="" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                      <option value="" disabled>Pilih dosen dari Book1.csv</option>
                      {lecturerProfiles.map(dosen => <option key={dosen.id} value={dosen.id}>{getLecturerDisplay(dosen)}</option>)}
                    </select>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[sintaKey, nidnKey, namaKey].map(column => <input key={column} value={fields[column] || ''} onChange={(event) => setField(column, event.target.value)} placeholder={column} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Catatan Verifikasi</label>
            <textarea value={formMeta.catatan} onChange={(event) => setFormMeta({ ...formMeta, catatan: event.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[92px]" />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button type="button" onClick={handleDownloadCsv} className="px-5 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 flex items-center justify-center gap-2"><Download className="w-5 h-5" /><span>Download CSV SINTA</span></button>
            <button type="submit" className="px-5 py-3 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 flex items-center justify-center gap-2"><Save className="w-5 h-5" /><span>Simpan Pengajuan</span></button>
          </div>
        </form>}

        <div className="space-y-6">
          {!isAdmin && <div className="bg-white p-5 rounded-lg border border-red-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4"><FileSpreadsheet className="w-5 h-5 text-red-700" /><h3 className="font-bold text-slate-900">Kelengkapan Template</h3></div>
            <p className="text-sm text-slate-600 mb-3">{filledRequired} dari {sintaRequiredColumns.length} kolom wajib terisi.</p>
            <div className="flex flex-wrap gap-2">{sintaRequiredColumns.map(column => <span key={column} className={`px-2.5 py-1 rounded-md text-xs font-medium ${fields[column] ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-500'}`}>{column}</span>)}</div>
          </div>}

          <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-900">Riwayat SINTA</h3></div>
            <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
              {sintaVerifications.map(item => (
                <div key={item.id} className="p-5 hover:bg-slate-50 transition-colors group">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700">{item.status}</span>
                      <h4 className="font-semibold text-slate-800 text-sm mt-3 line-clamp-2">{item.fields?.judul || item.jenisData}</h4>
                      <p className="text-sm text-slate-500">{item.namaPengaju} | {item.prodi}</p>
                      {item.finalDocument && <p className="text-xs text-red-700 mt-1">Dokumen final: {item.finalDocument.number}</p>}
                    </div>
                    <div className="flex items-start gap-2">
                      {item.finalDocument && item.status === 'Terverifikasi' && <button onClick={() => downloadSintaExcel(item.fields, `upload-research-sinta-${item.finalDocument?.id}.xls`)} className="px-3 py-1.5 bg-red-700 text-white rounded-md text-xs font-semibold flex items-center gap-1"><Download className="w-3.5 h-3.5" />Excel</button>}
                      {isAdmin && <select value={item.status} onChange={(event) => updateSintaVerificationStatus(item.id, event.target.value as SintaVerification['status'])} className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1"><option>Menunggu Verifikasi</option><option>Perlu Revisi</option><option>Terverifikasi</option></select>}
                      <button onClick={() => deleteSintaVerification(item.id)} className="self-start p-1.5 text-slate-300 hover:text-red-700 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {sintaVerifications.length === 0 && <div className="p-8 text-center text-slate-500">Belum ada pengajuan SINTA.</div>}
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
