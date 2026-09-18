import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Project, Prodi, Kategori, Skema, Status } from '../types';
import { motion } from 'motion/react';
import { suggestTitleImprovement } from '../services/geminiService';
import { Sparkles, Save, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';

export default function ProjectForm() {
  const { projects, addProject, updateProject, deleteProject } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const [formData, setFormData] = useState<Omit<Project, 'id'>>({
    judul: '',
    abstrak: '',
    kategori: 'Penelitian',
    skema: 'Internal',
    status: 'Proposal',
    prodi: 'TRL',
    ketua: '',
    anggota: '',
    tahunAnggaran: new Date().getFullYear().toString(),
    dana: 0,
  });

  const resetForm = () => {
    setFormData({
      judul: '',
      abstrak: '',
      kategori: 'Penelitian',
      skema: 'Internal',
      status: 'Proposal',
      prodi: 'TRL',
      ketua: '',
      anggota: '',
      tahunAnggaran: new Date().getFullYear().toString(),
      dana: 0,
    });
    setIsEditing(false);
    setCurrentId(null);
    setAiSuggestion('');
  };

  const handleEdit = (project: Project) => {
    setFormData({
      judul: project.judul,
      abstrak: project.abstrak,
      kategori: project.kategori,
      skema: project.skema,
      status: project.status,
      prodi: project.prodi,
      ketua: project.ketua,
      anggota: project.anggota,
      tahunAnggaran: project.tahunAnggaran,
      dana: project.dana,
    });
    setCurrentId(project.id);
    setIsEditing(true);
    setAiSuggestion('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && currentId) {
      updateProject(currentId, formData);
    } else {
      addProject(formData);
    }
    resetForm();
  };

  const handleAskAI = async () => {
    if (!formData.judul) return;
    setIsLoadingAI(true);
    setAiSuggestion('');
    const suggestion = await suggestTitleImprovement(formData.judul, formData.abstrak);
    setAiSuggestion(suggestion);
    setIsLoadingAI(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kelola Penelitian & PkM</h2>
          <p className="text-slate-500 mt-1">Input usulan baru atau perbarui status pelaksanaan.</p>
        </div>
        {isEditing && (
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Usulan Baru</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Kategori</label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value as Kategori })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                >
                  <option value="Penelitian">Penelitian</option>
                  <option value="Pengabdian">Pengabdian kepada Masyarakat</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Skema</label>
                <select
                  value={formData.skema}
                  onChange={(e) => setFormData({ ...formData, skema: e.target.value as Skema })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                >
                  <option value="Internal">Internal</option>
                  <option value="Hibah Kompetitif">Hibah Kompetitif</option>
                  <option value="Mandiri">Mandiri</option>
                </select>
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
                <label className="text-sm font-semibold text-slate-700">Status Pelaksanaan</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                >
                  <option value="Proposal">Proposal</option>
                  <option value="Laporan Kemajuan">Laporan Kemajuan</option>
                  <option value="Laporan Akhir">Laporan Akhir</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Judul Usulan</label>
                <button
                  type="button"
                  onClick={handleAskAI}
                  disabled={!formData.judul || isLoadingAI}
                  className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center space-x-1 disabled:opacity-50"
                >
                  {isLoadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>Minta Saran AI</span>
                </button>
              </div>
              <textarea
                required
                value={formData.judul}
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow min-h-[80px]"
                placeholder="Masukkan judul penelitian atau pengabdian..."
              />
            </div>

            {aiSuggestion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 border border-red-100 p-4 rounded-xl text-sm text-red-800 whitespace-pre-wrap"
              >
                <div className="flex items-center space-x-2 mb-2 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>Saran Asisten AI:</span>
                </div>
                {aiSuggestion}
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Abstrak Singkat (Opsional)</label>
              <textarea
                value={formData.abstrak}
                onChange={(e) => setFormData({ ...formData, abstrak: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow min-h-[100px]"
                placeholder="Deskripsikan secara singkat latar belakang dan tujuan..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Ketua Peneliti/Pengabdi</label>
                <input
                  type="text"
                  required
                  value={formData.ketua}
                  onChange={(e) => setFormData({ ...formData, ketua: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                  placeholder="Nama lengkap beserta gelar"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Anggota Tim</label>
                <input
                  type="text"
                  required
                  value={formData.anggota}
                  onChange={(e) => setFormData({ ...formData, anggota: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                  placeholder="Pisahkan dengan koma jika lebih dari satu"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Tahun Anggaran</label>
                <input
                  type="text"
                  required
                  value={formData.tahunAnggaran}
                  onChange={(e) => setFormData({ ...formData, tahunAnggaran: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                  placeholder="Contoh: 2024"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Dana (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.dana}
                  onChange={(e) => setFormData({ ...formData, dana: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                  placeholder="Jumlah dana disetujui"
                />
              </div>
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

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center space-x-2 shadow-sm shadow-red-200"
              >
                <Save className="w-5 h-5" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Usulan'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* List Section */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 px-1">Daftar Usulan</h3>
          <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`p-4 rounded-2xl border transition-all ${
                  currentId === project.id
                    ? 'bg-red-50 border-red-200 shadow-sm'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    {project.prodi}
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h4 className="font-semibold text-slate-800 text-sm leading-snug mb-2 line-clamp-2">
                  {project.judul}
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{project.ketua}</span>
                  <span className={`font-medium ${
                    project.status === 'Laporan Akhir' ? 'text-red-600' :
                    project.status === 'Laporan Kemajuan' ? 'text-indigo-600' :
                    'text-slate-600'
                  }`}>
                    {project.status}
                  </span>
                </div>
                {project.fileName && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center space-x-1.5 text-xs text-slate-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate" title={project.fileName}>{project.fileName}</span>
                  </div>
                )}
              </div>
            ))}
            {projects.length === 0 && (
              <div className="text-center p-8 text-slate-500 text-sm bg-white rounded-2xl border border-slate-100">
                Belum ada data usulan.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
