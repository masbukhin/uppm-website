import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Publication } from '../types';
import { motion } from 'motion/react';
import { formatPublication } from '../services/geminiService';
import { Sparkles, Save, Loader2, BookOpen, Link as LinkIcon, Trash2 } from 'lucide-react';

export default function PublicationForm() {
  const { publications, addPublication, deletePublication } = useStore();
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const [formData, setFormData] = useState<Omit<Publication, 'id'>>({
    judul: '',
    penulis: '',
    jenis: 'Jurnal Nasional',
    namaJurnal: '',
    tahun: new Date().getFullYear().toString(),
    volume: '',
    nomor: '',
    halaman: '',
    url: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPublication(formData);
    setFormData({
      judul: '',
      penulis: '',
      jenis: 'Jurnal Nasional',
      namaJurnal: '',
      tahun: new Date().getFullYear().toString(),
      volume: '',
      nomor: '',
      halaman: '',
      url: '',
    });
    setAiSuggestion('');
  };

  const handleFormatAI = async () => {
    if (!formData.judul || !formData.penulis || !formData.namaJurnal) return;
    setIsLoadingAI(true);
    setAiSuggestion('');
    const suggestion = await formatPublication(formData);
    setAiSuggestion(suggestion);
    setIsLoadingAI(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Sinkronisasi Publikasi</h2>
        <p className="text-slate-500 mt-1">Format data publikasi untuk persiapan input ke SINTA.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Jenis Publikasi</label>
              <select
                value={formData.jenis}
                onChange={(e) => setFormData({ ...formData, jenis: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
              >
                <option value="Jurnal Nasional">Jurnal Nasional</option>
                <option value="Jurnal Internasional">Jurnal Internasional</option>
                <option value="Prosiding">Prosiding</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Judul Artikel</label>
              <textarea
                required
                value={formData.judul}
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow min-h-[80px]"
                placeholder="Masukkan judul artikel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Penulis (Sesuai urutan)</label>
              <input
                type="text"
                required
                value={formData.penulis}
                onChange={(e) => setFormData({ ...formData, penulis: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                placeholder="Contoh: Budi Santoso, Andi M"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nama Jurnal / Prosiding</label>
              <input
                type="text"
                required
                value={formData.namaJurnal}
                onChange={(e) => setFormData({ ...formData, namaJurnal: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                placeholder="Contoh: Jurnal Teknik Mesin Indonesia"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Tahun</label>
                <input
                  type="text"
                  required
                  value={formData.tahun}
                  onChange={(e) => setFormData({ ...formData, tahun: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Volume</label>
                <input
                  type="text"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nomor</label>
                <input
                  type="text"
                  value={formData.nomor}
                  onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Halaman</label>
                <input
                  type="text"
                  value={formData.halaman}
                  onChange={(e) => setFormData({ ...formData, halaman: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                  placeholder="1-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">URL / DOI</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                placeholder="https://doi.org/..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Dokumen PDF (Opsional)</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData({ ...formData, fileName: file.name });
                  }
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />
              {formData.fileName && (
                <p className="text-xs text-slate-500 mt-1">File terpilih: <span className="font-medium text-slate-700">{formData.fileName}</span></p>
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={handleFormatAI}
                disabled={!formData.judul || !formData.penulis || !formData.namaJurnal || isLoadingAI}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoadingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span>Format Sitasi (AI)</span>
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 shadow-sm shadow-red-200"
              >
                <Save className="w-5 h-5" />
                <span>Simpan Publikasi</span>
              </button>
            </div>
          </form>
        </div>

        {/* List & AI Section */}
        <div className="space-y-6">
          {aiSuggestion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-100 p-6 rounded-2xl text-sm text-red-800 whitespace-pre-wrap shadow-sm"
            >
              <div className="flex items-center space-x-2 mb-4 font-semibold text-red-900 border-b border-red-200 pb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-base">Hasil Format & Panduan SINTA</span>
              </div>
              <div className="leading-relaxed">
                {aiSuggestion}
              </div>
            </motion.div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Daftar Publikasi Tersimpan</h3>
              <BookOpen className="w-5 h-5 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {publications.map((pub) => (
                <div key={pub.id} className="p-6 hover:bg-slate-50 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                      {pub.jenis}
                    </span>
                    <button
                      onClick={() => deletePublication(pub.id)}
                      className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm leading-snug mb-1">
                    {pub.judul}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2">{pub.penulis}</p>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="font-medium">{pub.namaJurnal}</span>
                    <span>Tahun: {pub.tahun}</span>
                    {pub.volume && <span>Vol: {pub.volume}</span>}
                    {pub.nomor && <span>No: {pub.nomor}</span>}
                    {pub.halaman && <span>Hal: {pub.halaman}</span>}
                  </div>
                  <div className="flex items-center space-x-4 mt-3">
                    {pub.url && (
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>Lihat Artikel</span>
                      </a>
                    )}
                    {pub.fileName && (
                      <span className="inline-flex items-center space-x-1 text-xs text-slate-500 font-medium">
                        <BookOpen className="w-3 h-3" />
                        <span>{pub.fileName}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {publications.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Belum ada publikasi yang tersimpan.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
