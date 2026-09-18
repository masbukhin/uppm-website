import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Download, Filter, Users } from 'lucide-react';
import { PRODI_OPTIONS, getProdiLabel, normalizeProdi } from '../data/prodi';
import { getCurrentMonth, getMonthLabel, calculateSubmissionSummary } from '../services/notificationService';
import { useStore } from '../store/useStore';
import { Prodi } from '../types';

export default function MonthlyReportDashboard() {
  const { allMonthlyUpdates, allProjects, allPublications, allSintaVerifications, allClaimSubmissions, lecturerProfiles } = useStore();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedProdi, setSelectedProdi] = useState<Prodi | 'all'>('all');

  // Calculate submission summary
  const summary = useMemo(() => {
    return calculateSubmissionSummary(lecturerProfiles, allMonthlyUpdates, selectedMonth);
  }, [lecturerProfiles, allMonthlyUpdates, selectedMonth]);

  // Filter updates by month and prodi
  const filteredUpdates = useMemo(() => {
    let updates = allMonthlyUpdates.filter(u => u.bulan === selectedMonth);
    if (selectedProdi !== 'all') {
      updates = updates.filter(u => normalizeProdi(u.prodi) === selectedProdi);
    }
    return updates;
  }, [allMonthlyUpdates, selectedMonth, selectedProdi]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPenelitian = filteredUpdates.reduce((sum, u) => sum + u.penelitian.length, 0);
    const totalPublikasi = filteredUpdates.reduce((sum, u) => sum + u.publikasi.length, 0);
    const totalPkm = filteredUpdates.reduce((sum, u) => sum + u.pkm.length, 0);
    const totalSintaImport = filteredUpdates.reduce((sum, u) => sum + (u.totalPublikasiSinta || 0), 0);

    return { totalPenelitian, totalPublikasi, totalPkm, totalSintaImport };
  }, [filteredUpdates]);

  // Generate months list
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

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Nama', 'NIP/NUPTK', 'Prodi', 'Penelitian', 'Publikasi', 'PKM', 'Status'];
    const rows = filteredUpdates.map(u => [
      u.namaDosen,
      u.nuptk,
      getProdiLabel(u.prodi),
      u.penelitian.length.toString(),
      u.publikasi.length.toString(),
      u.pkm.length.toString(),
      u.statusLaporan,
    ]);

    // Add dosen yang belum submit
    const submittedDosenIds = new Set(filteredUpdates.map(u => u.dosenId));
    const belumSubmitDosen = lecturerProfiles.filter(
      d => !submittedDosenIds.has(d.id) && (selectedProdi === 'all' || d.prodi === selectedProdi)
    );

    for (const dosen of belumSubmitDosen) {
      rows.push([dosen.nama, dosen.nuptk, getProdiLabel(dosen.prodi), '0', '0', '0', 'Belum']);
    }

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-penelitian-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Laporan Bulanan Penelitian</h2>
          <p className="text-slate-500 mt-1">Ringkasan pengiriman laporan penelitian dan pengabdian dosen.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <label className="text-sm font-semibold text-slate-700">Bulan:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            {availableMonths.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <label className="text-sm font-semibold text-slate-700">Prodi:</label>
          <select
            value={selectedProdi}
            onChange={(e) => setSelectedProdi(e.target.value as Prodi | 'all')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="all">Semua Prodi</option>
            {PRODI_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <Users className="w-6 h-6 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Dosen</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalDosen}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <Calendar className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Sudah Submit</p>
              <p className="text-2xl font-bold text-green-700">{summary.sudahSubmit}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Users className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Belum Submit</p>
              <p className="text-2xl font-bold text-amber-700">{summary.belumSubmit}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Persentase Submit</p>
              <p className="text-2xl font-bold text-blue-700">
                {summary.totalDosen > 0 ? Math.round((summary.sudahSubmit / summary.totalDosen) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Per Prodi Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Rekap Per Program Studi</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {PRODI_OPTIONS.map((prodi) => {
            const prodiData = summary.perProdi[prodi.value];
            const percentage = prodiData.sudah + prodiData.belum > 0
              ? Math.round((prodiData.sudah / (prodiData.sudah + prodiData.belum)) * 100)
              : 0;

            return (
              <div key={prodi.value} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="font-bold text-red-700">{prodi.shortLabel}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{prodi.label}</p>
                    <p className="text-sm text-slate-500">
                      {prodiData.sudah} sudah submit / {prodiData.belum} belum submit
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{percentage}%</div>
                  <div className="w-32 h-2 bg-slate-100 rounded-full mt-2">
                    <div
                      className="h-full bg-red-600 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Submissions */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Detail Pengiriman Laporan</h3>
          <span className="text-sm text-slate-500">
            {filteredUpdates.length} laporan diterima
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Nama</th>
                <th className="px-6 py-4 font-semibold">Prodi</th>
                <th className="px-6 py-4 font-semibold">Penelitian</th>
                <th className="px-6 py-4 font-semibold">Publikasi</th>
                <th className="px-6 py-4 font-semibold">PKM</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUpdates.map((update) => (
                <tr key={update.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{update.namaDosen}</td>
                  <td className="px-6 py-4 text-slate-600">{getProdiLabel(update.prodi)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {update.penelitian.length}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      {update.publikasi.length}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                      {update.pkm.length}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      update.statusLaporan === 'Diterima'
                        ? 'bg-green-100 text-green-800'
                        : update.statusLaporan === 'Dikirim'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {update.statusLaporan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(update.submittedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}

              {filteredUpdates.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Belum ada data pengiriman laporan untuk bulan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
        <h3 className="font-bold text-red-900 mb-4">Statistik Keseluruhan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-red-700">Total Penelitian</p>
            <p className="text-2xl font-bold text-red-900">{stats.totalPenelitian}</p>
          </div>
          <div>
            <p className="text-sm text-red-700">Total Publikasi</p>
            <p className="text-2xl font-bold text-red-900">{stats.totalPublikasi}</p>
          </div>
          <div>
            <p className="text-sm text-red-700">Total PKM</p>
            <p className="text-2xl font-bold text-red-900">{stats.totalPkm}</p>
          </div>
          <div>
            <p className="text-sm text-red-700">Import dari SINTA</p>
            <p className="text-2xl font-bold text-red-900">{stats.totalSintaImport}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
