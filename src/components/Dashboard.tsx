import React from 'react';
import { Project } from '../types';
import { useStore } from '../store/useStore';
import { motion } from 'motion/react';
import { BarChart3, Users, BookOpen, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const { projects } = useStore();

  const stats = [
    {
      label: 'Total Usulan',
      value: projects.length,
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Penelitian',
      value: projects.filter(p => p.kategori === 'Penelitian').length,
      icon: BarChart3,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Pengabdian',
      value: projects.filter(p => p.kategori === 'Pengabdian').length,
      icon: Users,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Selesai (Laporan Akhir)',
      value: projects.filter(p => p.status === 'Laporan Akhir').length,
      icon: CheckCircle2,
      color: 'bg-indigo-50 text-indigo-600',
    },
  ];

  // Group by Prodi
  const prodis = ['TRL', 'TSP', 'TPM'] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Rekapitulasi</h2>
        <p className="text-slate-500 mt-1">Ringkasan data Penelitian dan PkM Politeknik Sinarmas Berau Coal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Rekap Berdasarkan Program Studi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Kategori</th>
                <th className="p-4 font-semibold">Prodi</th>
                <th className="p-4 font-semibold">Judul</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prodis.map(prodi => {
                const prodiProjects = projects.filter(p => p.prodi === prodi);
                if (prodiProjects.length === 0) return null;
                
                return prodiProjects.map((project, idx) => (
                  <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        project.kategori === 'Penelitian' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {project.kategori}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-700">{project.prodi}</td>
                    <td className="p-4 text-slate-600 max-w-md truncate" title={project.judul}>{project.judul}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        project.status === 'Laporan Akhir' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'Laporan Kemajuan' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                  </tr>
                ));
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Belum ada data usulan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
