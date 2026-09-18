import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { SuratKeterangan, Prodi } from '../types';
import { motion } from 'motion/react';
import { Save, FileSignature, Trash2, Clock, CheckCircle2, Loader2 } from 'lucide-react';

export default function SuratKeteranganForm() {
  const { surat, addSurat, deleteSurat } = useStore();

  const [formData, setFormData] = useState<Omit<SuratKeterangan, 'id' | 'tanggalRequest' | 'status'>>({
    nama: '',
    prodi: 'TRL',
    jenisSurat: 'Surat Tugas Penelitian',
    keperluan: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSurat(formData);
    setFormData({
      nama: '',
      prodi: 'TRL',
      jenisSurat: 'Surat Tugas Penelitian',
      keperluan: '',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Permintaan Surat Keterangan</h2>
        <p className="text-slate-500 mt-1">Ajukan permintaan surat tugas atau surat keterangan selesai ke UPPM.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nama Lengkap (beserta gelar)</label>
              <input
                type="text"
                required
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                placeholder="Contoh: Dr. Budi Santoso"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Program Studi</label>
              <select
                value={formData.prodi}
                onChange={(e) => setFormData({ ...formData, prodi: e.target.value as Prodi })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
              >
                <option value="TRL">Teknologi Rekayasa Logistik (TRL)</option>
                <option value="SVM">Survei dan Pemetaan (SVM)</option>
                <option value="PM">Perawatan Mesin (PM)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Jenis Surat</label>
              <select
                value={formData.jenisSurat}
                onChange={(e) => setFormData({ ...formData, jenisSurat: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
              >
                <option value="Surat Tugas Penelitian">Surat Tugas Penelitian</option>
                <option value="Surat Tugas Pengabdian">Surat Tugas Pengabdian</option>
                <option value="Surat Keterangan Selesai">Surat Keterangan Selesai</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Keperluan / Keterangan Tambahan</label>
              <textarea
                required
                value={formData.keperluan}
                onChange={(e) => setFormData({ ...formData, keperluan: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow min-h-[100px]"
                placeholder="Sebutkan judul penelitian/pengabdian atau keperluan spesifik lainnya..."
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center space-x-2 shadow-sm shadow-red-200"
              >
                <Save className="w-5 h-5" />
                <span>Ajukan Permintaan</span>
              </button>
            </div>
          </form>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Riwayat Permintaan</h3>
            <FileSignature className="w-5 h-5 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {surat.map((s) => (
              <div key={s.id} className="p-6 hover:bg-slate-50 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    {s.jenisSurat}
                  </span>
                  <button
                    onClick={() => deleteSurat(s.id)}
                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-semibold text-slate-800 text-sm leading-snug mb-1">
                  {s.nama} <span className="text-slate-400 font-normal">({s.prodi})</span>
                </h4>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{s.keperluan}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {new Date(s.tanggalRequest).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <div className="flex items-center space-x-1">
                    {s.status === 'Menunggu' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                    {s.status === 'Diproses' && <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />}
                    {s.status === 'Selesai' && <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />}
                    <span className={`font-medium ${
                      s.status === 'Menunggu' ? 'text-amber-600' :
                      s.status === 'Diproses' ? 'text-red-600' :
                      'text-red-600'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {surat.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Belum ada riwayat permintaan surat.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
