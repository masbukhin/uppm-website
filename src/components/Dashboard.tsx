import { motion } from 'motion/react';
import { Award, CheckCircle2, Clock3, FileCheck2, FileSignature, Hourglass, LayoutList, Users } from 'lucide-react';
import { PRODI_OPTIONS, getProdiLabel, normalizeProdi } from '../data/prodi';
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

  const stats = [
    { label: 'Total Pengajuan', value: totalPengajuan, icon: LayoutList, color: 'bg-red-50 text-red-700' },
    { label: 'Menunggu', value: menunggu, icon: Clock3, color: 'bg-amber-50 text-amber-700' },
    { label: 'Diproses/Revisi', value: diproses, icon: Hourglass, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Final', value: selesai, icon: CheckCircle2, color: 'bg-red-50 text-red-700' },
    { label: 'Surat Tugas', value: suratTugas.length, icon: FileSignature, color: 'bg-slate-100 text-slate-700' },
    { label: 'SINTA', value: sintaVerifications.length, icon: FileCheck2, color: 'bg-slate-100 text-slate-700' },
    { label: 'Klaim', value: claimSubmissions.length, icon: Award, color: 'bg-slate-100 text-slate-700' },
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
    </motion.div>
  );
}
