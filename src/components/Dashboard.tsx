import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Award, CheckCircle2, Clock3, FileCheck2, FileSignature, Hourglass, LayoutList, Users } from 'lucide-react';
import { PRODI_OPTIONS, getProdiLabel, normalizeProdi } from '../data/prodi';
import { historicalProjects } from '../data/historicalProjects';
import { useStore } from '../store/useStore';

type ActivityRow = {
  id: string;
  jenis: string;
  prodi?: string;
  judul: string;
  status: string;
  tanggal: string;
  pemilik?: string;
};

const finalStatuses = new Set(['Disetujui', 'Terverifikasi', 'Selesai', 'Laporan Akhir']);
const processStatuses = new Set(['Diproses', 'Perlu Revisi', 'Laporan Kemajuan']);

function formatDate(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
  const { claimSubmissions, currentUser, isAdmin, projects, sintaVerifications, surat, suratTugas } = useStore();
  const historicYears = useMemo(() => [...new Set(historicalProjects.map(item => item.tahun.match(/20\d{2}/)?.[0]).filter((year): year is string => Boolean(year && ['2023', '2024', '2025'].includes(year))))].sort().reverse(), []);
  const [historicYear, setHistoricYear] = useState('Semua');

  const activityRows: ActivityRow[] = [
    ...suratTugas.map(item => ({ id: item.id, jenis: 'Surat Tugas', prodi: item.prodi, judul: item.namaKegiatan, status: item.status, tanggal: item.tanggalPengajuan, pemilik: item.ownerName || item.ketua })),
    ...sintaVerifications.map(item => ({ id: item.id, jenis: 'SINTA', prodi: item.prodi, judul: item.fields?.judul || `${item.jenisData} ${item.tahunPelaksanaan}`, status: item.status, tanggal: item.tanggalPengajuan, pemilik: item.ownerName || item.namaPengaju })),
    ...claimSubmissions.map(item => ({ id: item.id, jenis: 'Klaim', prodi: item.prodi, judul: item.judul, status: item.status, tanggal: item.tanggalPengajuan, pemilik: item.ownerName || item.namaPengaju })),
    ...surat.map(item => ({ id: item.id, jenis: 'Surat Keterangan', prodi: item.prodi, judul: item.keperluan, status: item.status, tanggal: item.tanggalRequest, pemilik: item.ownerName || item.nama })),
    ...projects.map(item => ({ id: item.id, jenis: item.kategori, prodi: item.prodi, judul: item.judul, status: item.status, tanggal: item.tahunAnggaran, pemilik: item.ownerName || item.ketua })),
  ].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const totalPengajuan = activityRows.length;
  const menunggu = activityRows.filter(row => !finalStatuses.has(row.status) && !processStatuses.has(row.status)).length;
  const diproses = activityRows.filter(row => processStatuses.has(row.status)).length;
  const selesai = activityRows.filter(row => finalStatuses.has(row.status)).length;
  const historicalResearch = historicalProjects.filter(item => item.kategori === 'Penelitian');
  const historicalCommunity = historicalProjects.filter(item => item.kategori === 'Pengabdian');
  const adminHistoricalProjects = historicalProjects.filter(item => {
    const year = item.tahun.match(/20\d{2}/)?.[0];
    return Boolean(year && ['2023', '2024', '2025'].includes(year) && (historicYear === 'Semua' || year === historicYear));
  });

  const stats = [
    { label: 'Total Pengajuan', value: totalPengajuan, icon: LayoutList, color: 'bg-red-50 text-red-700' },
    { label: 'Menunggu', value: menunggu, icon: Clock3, color: 'bg-amber-50 text-amber-700' },
    { label: 'Diproses/Revisi', value: diproses, icon: Hourglass, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Final', value: selesai, icon: CheckCircle2, color: 'bg-red-50 text-red-700' },
    { label: 'Surat Tugas', value: suratTugas.length, icon: FileSignature, color: 'bg-slate-100 text-slate-700' },
    { label: 'SINTA', value: sintaVerifications.length, icon: FileCheck2, color: 'bg-slate-100 text-slate-700' },
    { label: 'Klaim', value: claimSubmissions.length, icon: Award, color: 'bg-slate-100 text-slate-700' },
    ...(isAdmin ? [
      { label: 'Penelitian Historis', value: historicalResearch.length, icon: FileCheck2, color: 'bg-indigo-50 text-indigo-700' },
      { label: 'Pengabdian Historis', value: historicalCommunity.length, icon: FileSignature, color: 'bg-emerald-50 text-emerald-700' },
    ] : []),
    { label: 'Pemilik Data', value: isAdmin ? new Set(activityRows.map(row => row.pemilik).filter(Boolean)).size : 1, icon: Users, color: 'bg-slate-100 text-slate-700' },
  ];

  const prodiSummary = PRODI_OPTIONS.map(option => {
    const count = activityRows.filter(row => normalizeProdi(row.prodi) === option.value).length;
    const finalCount = activityRows.filter(row => normalizeProdi(row.prodi) === option.value && finalStatuses.has(row.status)).length;
    return { ...option, count, finalCount };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Rekapitulasi</h2>
        <p className="text-slate-500 mt-1">
          {isAdmin ? 'Ringkasan seluruh input dosen.' : `Ringkasan pengajuan milik ${currentUser?.nama || 'akun ini'}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-5 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}><Icon className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <section className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Rekap Program Studi</h3></div>
          <div className="divide-y divide-slate-100">
            {prodiSummary.map(item => (
              <div key={item.value} className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.finalCount} final</p>
                </div>
                <span className="rounded-lg bg-red-50 px-3 py-1 text-sm font-bold text-red-700">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Riwayat Terbaru</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4 font-semibold">Jenis</th>
                  <th className="p-4 font-semibold">Prodi</th>
                  {isAdmin && <th className="p-4 font-semibold">Pemilik</th>}
                  <th className="p-4 font-semibold">Judul/Kegiatan</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityRows.slice(0, 12).map(row => (
                  <tr key={`${row.jenis}-${row.id}`} className="hover:bg-slate-50">
                    <td className="p-4 font-semibold text-red-700">{row.jenis}</td>
                    <td className="p-4 text-slate-600">{getProdiLabel(row.prodi)}</td>
                    {isAdmin && <td className="p-4 text-slate-600 max-w-48 truncate">{row.pemilik || '-'}</td>}
                    <td className="p-4 text-slate-700 max-w-md truncate" title={row.judul}>{row.judul}</td>
                    <td className="p-4"><span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.status}</span></td>
                    <td className="p-4 text-slate-500">{formatDate(row.tanggal)}</td>
                  </tr>
                ))}
                {activityRows.length === 0 && (
                  <tr><td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-slate-500">Belum ada data pengajuan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isAdmin && <section className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-bold text-slate-900">Riwayat Penelitian dan Pengabdian</h3>
          <p className="mt-1 text-sm text-slate-500">Daftar penelitian dan PKM dari rekap UPPM tahun 2023–2025, terpisah dari pengajuan aktif.</p>
          <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">Tahun
            <select value={historicYear} onChange={event => setHistoricYear(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option>Semua</option>{historicYears.map(year => <option key={year}>{year}</option>)}
            </select>
          </label>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="p-4">Tahun</th><th className="p-4">Kategori</th><th className="p-4">Prodi</th><th className="p-4">Ketua</th><th className="p-4">Judul</th><th className="p-4">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{adminHistoricalProjects.map((item, index) => <tr key={`${item.kategori}-${item.referensi}-${index}`}><td className="whitespace-nowrap p-4">{item.tahun}</td><td className="p-4">{item.kategori}</td><td className="p-4">{getProdiLabel(item.prodi)}</td><td className="p-4">{item.ketua}</td><td className="min-w-72 p-4">{item.judul}</td><td className="p-4">{item.status === '-' ? 'Riwayat' : item.status}</td></tr>)}
              {adminHistoricalProjects.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada penelitian atau PKM pada tahun ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}
    </motion.div>
  );
}
