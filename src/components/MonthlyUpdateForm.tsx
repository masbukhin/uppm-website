import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Calendar, FileText, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { getCurrentMonth, getMonthLabel, isPastDeadline } from '../services/notificationService';
import { useStore } from '../store/useStore';
import { PenelitianEntry, PkmEntry, Prodi, PublikasiEntry } from '../types';
import SintaImportDialog from './SintaImportDialog';

type TabType = 'penelitian' | 'publikasi' | 'pkm' | 'sinta';

export default function MonthlyUpdateForm() {
  const { currentUser, monthlyUpdates, addMonthlyUpdate, updateMonthlyUpdate } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('penelitian');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showSintaDialog, setShowSintaDialog] = useState(false);

  // Find existing update for this month
  const existingUpdate = useMemo(() => {
    return monthlyUpdates.find(
      update => update.dosenId === currentUser?.dosenId && update.bulan === selectedMonth
    );
  }, [monthlyUpdates, currentUser, selectedMonth]);

  const [penelitian, setPenelitian] = useState<PenelitianEntry[]>(
    existingUpdate?.penelitian || []
  );
  const [publikasi, setPublikasi] = useState<PublikasiEntry[]>(
    existingUpdate?.publikasi || []
  );
  const [pkm, setPkm] = useState<PkmEntry[]>(
    existingUpdate?.pkm || []
  );
  const [sintaProfileUrl, setSintaProfileUrl] = useState(existingUpdate?.sintaProfileUrl || '');
  const [catatan, setCatatan] = useState(existingUpdate?.catatan || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = penelitian.length > 0 || publikasi.length > 0 || pkm.length > 0;
  const isDeadlinePassed = isPastDeadline(selectedMonth);

  // Generate months for selector
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({ value: monthStr, label: getMonthLabel(monthStr) });
    }
    return months;
  }, []);

  const handleAddPenelitian = () => {
    setPenelitian([
      ...penelitian,
      { judul: '', status: 'Sedang Berjalan', deskripsi: '', persentase: 0 },
    ]);
  };

  const handleUpdatePenelitian = (index: number, field: keyof PenelitianEntry, value: string | number) => {
    const updated = [...penelitian];
    updated[index] = { ...updated[index], [field]: value };
    setPenelitian(updated);
  };

  const handleDeletePenelitian = (index: number) => {
    setPenelitian(penelitian.filter((_, i) => i !== index));
  };

  const handleAddPublikasi = () => {
    setPublikasi([
      ...publikasi,
      { judul: '', jenis: 'Jurnal Nasional', namaJurnal: '', tahun: new Date().getFullYear().toString(), status: 'Sudah Dipublikasikan' },
    ]);
  };

  const handleUpdatePublikasi = (index: number, field: keyof PublikasiEntry, value: string) => {
    const updated = [...publikasi];
    updated[index] = { ...updated[index], [field]: value };
    setPublikasi(updated);
  };

  const handleDeletePublikasi = (index: number) => {
    setPublikasi(publikasi.filter((_, i) => i !== index));
  };

  const handleAddPkm = () => {
    setPkm([
      ...pkm,
      { judul: '', jenis: '', status: 'Sedang Berjalan', deskripsi: '' },
    ]);
  };

  const handleUpdatePkm = (index: number, field: keyof PkmEntry, value: string) => {
    const updated = [...pkm];
    updated[index] = { ...updated[index], [field]: value };
    setPkm(updated);
  };

  const handleDeletePkm = (index: number) => {
    setPkm(pkm.filter((_, i) => i !== index));
  };

  const handleImportFromSinta = (publications: PublikasiEntry[]) => {
    setPublikasi([...publikasi, ...publications]);
    setShowSintaDialog(false);
  };

  const handleSubmit = async () => {
    if (!currentUser || !canSubmit) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        bulan: selectedMonth,
        namaDosen: currentUser.nama,
        nuptk: currentUser.nuptk || '',
        prodi: currentUser.prodi || 'TRL',
        dosenId: currentUser.dosenId || '',
        statusLaporan: 'Dikirim' as const,
        penelitian,
        publikasi,
        pkm,
        sintaProfileUrl,
        sintaLastSync: sintaProfileUrl ? new Date().toISOString() : undefined,
        totalPublikasiSinta: publikasi.filter(p => p.sintaId).length,
        catatan,
      };

      if (existingUpdate) {
        updateMonthlyUpdate(existingUpdate.id, updateData);
      } else {
        addMonthlyUpdate(updateData);
      }
    } catch (error) {
      console.error('Error saving monthly update:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: Array<{ id: TabType; label: string; icon: typeof BookOpen; count: number }> = [
    { id: 'penelitian', label: 'Penelitian', icon: BookOpen, count: penelitian.length },
    { id: 'publikasi', label: 'Publikasi', icon: FileText, count: publikasi.length },
    { id: 'pkm', label: 'PKM', icon: Calendar, count: pkm.length },
    { id: 'sinta', label: 'SINTA', icon: RefreshCw, count: publikasi.filter(p => p.sintaId).length },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Update Bulanan Penelitian</h2>
          <p className="text-slate-500 mt-1">Isi laporan penelitian, publikasi, dan PKM Anda untuk bulan ini.</p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            {availableMonths.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          {existingUpdate && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              ✓ Sudah Kirim
            </span>
          )}
        </div>
      </div>

      {isDeadlinePassed && !existingUpdate && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">⚠️ Batas waktu pengiriman laporan sudah lewat. Segera kirimkan laporan Anda.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0.5 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-700 text-red-700 bg-red-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
        {/* Penelitian Tab */}
        {activeTab === 'penelitian' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Daftar Penelitian</h3>
              <button
                onClick={handleAddPenelitian}
                className="px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Penelitian
              </button>
            </div>

            {penelitian.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Belum ada data penelitian. Klik "Tambah Penelitian" untuk menambahkan.
              </div>
            )}

            {penelitian.map((item, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <input
                    type="text"
                    value={item.judul}
                    onChange={(e) => handleUpdatePenelitian(index, 'judul', e.target.value)}
                    placeholder="Judul Penelitian"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdatePenelitian(index, 'status', e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="Tahap Proposal">Tahap Proposal</option>
                    <option value="Sedang Berjalan">Sedang Berjalan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                  <button
                    onClick={() => handleDeletePenelitian(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={item.deskripsi}
                  onChange={(e) => handleUpdatePenelitian(index, 'deskripsi', e.target.value)}
                  placeholder="Deskripsi kemajuan penelitian"
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />

                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-600">Persentase Selesai:</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={item.persentase}
                    onChange={(e) => handleUpdatePenelitian(index, 'persentase', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-sm font-medium text-slate-700">{item.persentase}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Publikasi Tab */}
        {activeTab === 'publikasi' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Daftar Publikasi</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSintaDialog(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Import SINTA
                </button>
                <button
                  onClick={handleAddPublikasi}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Manual
                </button>
              </div>
            </div>

            {publikasi.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Belum ada data publikasi. Import dari SINTA atau tambahkan manual.
              </div>
            )}

            {publikasi.map((item, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <input
                    type="text"
                    value={item.judul}
                    onChange={(e) => handleUpdatePublikasi(index, 'judul', e.target.value)}
                    placeholder="Judul Publikasi"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  {item.sintaId && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      SINTA
                    </span>
                  )}
                  <button
                    onClick={() => handleDeletePublikasi(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={item.jenis}
                    onChange={(e) => handleUpdatePublikasi(index, 'jenis', e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="Jurnal Nasional">Jurnal Nasional</option>
                    <option value="Jurnal Internasional">Jurnal Internasional</option>
                    <option value="Prosiding">Prosiding</option>
                  </select>

                  <input
                    type="text"
                    value={item.namaJurnal}
                    onChange={(e) => handleUpdatePublikasi(index, 'namaJurnal', e.target.value)}
                    placeholder="Nama Jurnal"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />

                  <input
                    type="text"
                    value={item.tahun}
                    onChange={(e) => handleUpdatePublikasi(index, 'tahun', e.target.value)}
                    placeholder="Tahun"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PKM Tab */}
        {activeTab === 'pkm' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Daftar PKM (Pengabdian kepada Masyarakat)</h3>
              <button
                onClick={handleAddPkm}
                className="px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah PKM
              </button>
            </div>

            {pkm.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Belum ada data PKM. Klik "Tambah PKM" untuk menambahkan.
              </div>
            )}

            {pkm.map((item, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <input
                    type="text"
                    value={item.judul}
                    onChange={(e) => handleUpdatePkm(index, 'judul', e.target.value)}
                    placeholder="Judul PKM"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdatePkm(index, 'status', e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="Tahap Proposal">Tahap Proposal</option>
                    <option value="Sedang Berjalan">Sedang Berjalan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                  <button
                    onClick={() => handleDeletePkm(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={item.jenis}
                  onChange={(e) => handleUpdatePkm(index, 'jenis', e.target.value)}
                  placeholder="Jenis PKM (contoh: Pelatihan, Penyuluhan, Riset Terapan)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />

                <textarea
                  value={item.deskripsi}
                  onChange={(e) => handleUpdatePkm(index, 'deskripsi', e.target.value)}
                  placeholder="Deskripsi kegiatan PKM"
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            ))}
          </div>
        )}

        {/* SINTA Tab */}
        {activeTab === 'sinta' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Integrasi SINTA</h3>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                Hubungkan profil SINTA Anda untuk mengimpor data publikasi secara otomatis.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">URL Profil SINTA</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={sintaProfileUrl}
                  onChange={(e) => setSintaProfileUrl(e.target.value)}
                  placeholder="https://sinta.kemdiktisaintek.go.id/affiliations/authors/XXXX"
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <button
                  onClick={() => setShowSintaDialog(true)}
                  disabled={!sintaProfileUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Fetch Data
                </button>
              </div>
            </div>

            {publikasi.filter(p => p.sintaId).length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  ✓ {publikasi.filter(p => p.sintaId).length} publikasi telah di-import dari SINTA
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-700 mb-2">Petunjuk:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
                <li>Buka profil SINTA Anda di browser</li>
                <li>Salin URL dari address bar</li>
                <li>Tempel URL di kolom di atas</li>
                <li>Klik "Fetch Data" untuk mengimpor publikasi</li>
                <li>Pilih publikasi yang ingin di-import</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Catatan */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-3">Catatan Tambahan</h3>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Tambahkan catatan atau informasi tambahan lainnya..."
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="px-6 py-3 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {existingUpdate ? 'Perbarui Laporan' : 'Kirim Laporan'}
            </>
          )}
        </button>
      </div>

      {/* SINTA Import Dialog */}
      {showSintaDialog && (
        <SintaImportDialog
          profileUrl={sintaProfileUrl}
          onImport={handleImportFromSinta}
          onClose={() => setShowSintaDialog(false)}
        />
      )}
    </motion.div>
  );
}
