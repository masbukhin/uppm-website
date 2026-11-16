import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CircleDollarSign, FileClock, History, Wallet } from 'lucide-react';
import { useStore } from '../store/useStore';
import { historicalProjects } from '../data/historicalProjects';
import { financeFundingDetails } from '../data/financeFunding';

const rupiah = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;
const getYear = (value?: string) => value?.match(/20\d{2}/)?.[0] || '';
const categoryName = (value: string) => value === 'Dana Penelitian' ? 'Penelitian' : value === 'Dana Pengabdian' ? 'PKM' : value;
const isPending = (status: string) => status === 'Menunggu' || status === 'Diproses';
const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function FinanceReport() {
  const { allClaimSubmissions } = useStore();
  const years = useMemo(() => [...new Set([
    ...allClaimSubmissions.map(item => getYear(item.tanggalPelaksanaan)),
    ...historicalProjects.map(item => getYear(item.tahun)),
    ...financeFundingDetails.map(item => item.tahun),
  ].filter(Boolean))].sort().reverse(), [allClaimSubmissions]);
  const [year, setYear] = useState('Semua');
  const claims = allClaimSubmissions.filter(item => year === 'Semua' || getYear(item.tanggalPelaksanaan) === year);
  const plans = claims.filter(item => item.tahap === 'Rencana Submit');
  const reimbursements = claims.filter(item => (item.tahap || 'Reimburse') === 'Reimburse');
  const approvedPlans = plans.filter(item => item.status === 'Disetujui');
  const pendingPlans = plans.filter(item => isPending(item.status));
  const approvedReimbursements = reimbursements.filter(item => item.status === 'Disetujui');
  const pendingReimbursements = reimbursements.filter(item => isPending(item.status));
  const approvedSpend = approvedReimbursements.reduce((sum, item) => sum + (item.nominal || 0), 0);
  const pendingSpend = pendingReimbursements.reduce((sum, item) => sum + (item.nominal || 0), 0);
  const history = historicalProjects.filter(item => year === 'Semua' || getYear(item.tahun) === year);
  const funding = financeFundingDetails.filter(item => year === 'Semua' || item.tahun === year);
  const financeYears = new Set<string>(financeFundingDetails.map(item => item.tahun));
  const internalFunding = funding.filter(item => item.sumber === 'Internal');
  const approvedClaimPlans = approvedPlans.filter(item =>
    (item.jenisKlaim === 'Dana Penelitian' || item.jenisKlaim === 'Dana Pengabdian')
    && !financeYears.has(getYear(item.tanggalPelaksanaan)),
  );
  const approvedBudget = internalFunding.reduce((sum, item) => sum + item.nominal, 0)
    + approvedClaimPlans.reduce((sum, item) => sum + (item.nominal || 0), 0);
  const approvedBudgetCount = internalFunding.length + approvedClaimPlans.length;
  const approvedBudgetNote = year === 'Semua'
    ? `${approvedBudgetCount} kegiatan · dana internal`
    : financeYears.has(year)
      ? `${internalFunding.length} kegiatan · internal penelitian dan PKM`
      : `${approvedClaimPlans.length} rencana penelitian/PKM disetujui`;
  const fundingYears = [...new Set(funding.map(item => item.tahun))].sort().reverse();
  const fundingByYear = fundingYears.map(fundingYear => {
    const rows = funding.filter(item => item.tahun === fundingYear);
    const internalTotal = rows.filter(item => item.sumber === 'Internal').reduce((sum, item) => sum + item.nominal, 0);
    const researchTotal = rows.filter(item => item.sumber === 'Internal' && item.kategori === 'Penelitian').reduce((sum, item) => sum + item.nominal, 0);
    const pkmTotal = rows.filter(item => item.sumber === 'Internal' && item.kategori === 'PKM').reduce((sum, item) => sum + item.nominal, 0);
    const externalTotal = rows.filter(item => item.sumber !== 'Internal').reduce((sum, item) => sum + item.nominal, 0);
    return { year: fundingYear, rows, internalTotal, researchTotal, pkmTotal, externalTotal };
  });

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-red-800 to-red-700 p-6 text-white shadow-sm sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-red-100">UPPM · Keuangan</p>
        <h2 className="mt-1 text-2xl font-bold">Laporan Keuangan</h2>
        <p className="mt-1 text-sm text-red-100">Pendanaan penelitian, PKM, rencana, dan reimburse yang tercatat.</p>
      </div>
      <label className="text-sm font-semibold">Tampilkan tahun
        <select value={year} onChange={event => setYear(event.target.value)} className="ml-2 rounded-lg border border-white/30 bg-white px-3 py-2 text-slate-800">
          <option>Semua</option>{years.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
    </header>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Wallet />} label="Rencana disetujui" value={rupiah(approvedBudget)} note={approvedBudgetNote} />
      <Metric icon={<CircleDollarSign />} label="Reimburse disetujui" value={rupiah(approvedSpend)} note={`${approvedReimbursements.length} klaim disetujui`} />
      <Metric icon={<FileClock />} label="Rencana menunggu" value={rupiah(pendingPlans.reduce((sum, item) => sum + (item.nominal || 0), 0))} note={`${pendingPlans.length} pengajuan`} />
      <Metric icon={<CircleDollarSign />} label="Reimburse menunggu" value={rupiah(pendingSpend)} note={`${pendingReimbursements.length} klaim`} />
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div><h3 className="font-bold text-slate-900">Pendanaan Penelitian dan PKM</h3><p className="mt-1 text-sm text-slate-500">Rincian nama, kegiatan, sumber, dan nominal dari laporan keuangan.</p></div>
        <span className="text-sm text-slate-500">{funding.length} kegiatan</span>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {fundingByYear.map(group => <details key={group.year} open={year !== 'Semua' || fundingYears.length === 1} className="overflow-hidden rounded-xl border border-slate-200">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 hover:bg-slate-100">
            <span className="font-semibold text-slate-800">Tahun {group.year} <span className="ml-2 text-xs font-normal text-slate-500">{group.rows.length} kegiatan</span></span>
            <span className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-right text-xs"><span className="text-slate-600">Penelitian {rupiah(group.researchTotal)}</span><span className="text-slate-600">PKM {rupiah(group.pkmTotal)}</span><strong className="text-sm text-red-800">Internal {rupiah(group.internalTotal)}</strong>{group.externalTotal > 0 && <span className="text-slate-500">Eksternal {rupiah(group.externalTotal)}</span>}</span>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500"><tr><th className="p-3">Ketua / tim</th><th className="p-3">Prodi</th><th className="p-3">Kategori</th><th className="p-3">Judul kegiatan</th><th className="p-3">Sumber</th><th className="whitespace-nowrap p-3 text-right">Pendanaan</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{group.rows.map((item, index) => <tr key={`${item.tahun}-${item.judul}-${index}`} className="hover:bg-slate-50"><td className="whitespace-nowrap p-3 font-medium text-slate-800">{item.ketua}</td><td className="p-3">{item.prodi}</td><td className="p-3">{item.kategori}</td><td className="min-w-72 p-3">{item.judul}</td><td className="p-3">{item.sumber || '-'}</td><td className="whitespace-nowrap p-3 text-right font-semibold">{rupiah(item.nominal)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>)}
        {funding.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Belum ada rincian pendanaan pada tahun ini.</p>}
      </div>
    </section>

    <ClaimTable title="Pengajuan Rencana Dana" description="Rencana dana beserta nilai dan status persetujuan." rows={plans} empty="Belum ada rencana pendanaan pada tahun ini." categoryName={categoryName} />
    <ClaimTable title="Reimburse dan Klaim" description="Klaim aktual yang dikirim melalui sistem, termasuk status persetujuan." rows={reimbursements} empty="Belum ada klaim atau reimburse pada tahun ini." categoryName={categoryName} />

    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 p-5"><History className="h-5 w-5 text-red-700" /><div><h3 className="font-bold text-slate-900">Riwayat Penelitian dan PKM</h3><p className="mt-1 text-sm text-slate-500">{history.length} kegiatan historis. Data tahun 2026 berasal dari daftar kegiatan UPPM.</p></div></div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="p-4">Tahun</th><th className="p-4">Prodi</th><th className="p-4">Kategori</th><th className="p-4">Ketua</th><th className="p-4">Anggota</th><th className="p-4">Judul</th><th className="p-4">Status / Referensi</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{history.map((item, index) => <tr key={`${item.kategori}-${item.referensi}-${index}`}><td className="whitespace-nowrap p-4">{item.tahun}</td><td className="p-4">{item.prodi}</td><td className="p-4">{item.kategori}</td><td className="p-4">{item.ketua}</td><td className="min-w-56 p-4">{item.anggota}</td><td className="min-w-72 p-4">{item.judul}</td><td className="p-4">{item.status !== '-' ? item.status : item.referensi}</td></tr>)}
            {history.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Belum ada riwayat pada tahun ini.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

function ClaimTable({ title, description, rows, empty, categoryName }: {
  title: string;
  description: string;
  rows: ReturnType<typeof useStore>['allClaimSubmissions'];
  empty: string;
  categoryName: (value: string) => string;
}) {
  return <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
    <div className="border-b border-slate-100 p-5"><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Tanggal</th><th className="p-4">Dosen</th><th className="p-4">Jenis</th><th className="p-4">Kegiatan</th><th className="p-4 text-right">Nominal</th><th className="p-4">Status</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map(item => <tr key={item.id} className="hover:bg-slate-50"><td className="whitespace-nowrap p-4">{formatDate(item.tanggalPelaksanaan)}</td><td className="p-4">{item.ownerName || item.namaPengaju}</td><td className="p-4">{categoryName(item.jenisKlaim)}</td><td className="min-w-64 p-4">{item.judul}</td><td className="whitespace-nowrap p-4 text-right font-semibold">{rupiah(item.nominal || 0)}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' : isPending(item.status) ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{item.status}</span></td></tr>)}
          {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}

function Metric({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2 text-red-700">{icon}<span className="text-sm font-semibold text-slate-600">{label}</span></div><p className="text-xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>;
}
