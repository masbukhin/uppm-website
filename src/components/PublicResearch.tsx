import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, FlaskConical, HandHeart, Search } from 'lucide-react';

type RecordLine = string;

const gallery = Array.from({ length: 35 }, (_, index) => `image${index + 1}.png`);

export default function PublicResearch() {
  const [lines, setLines] = useState<RecordLine[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Semua' | 'Penelitian' | 'Pengabdian'>('Semua');

  useEffect(() => {
    fetch('/research-records.json').then((response) => response.json()).then(setLines).catch(() => setLines([]));
  }, []);

  const entries = useMemo(() => {
    const section = category === 'Semua' ? '' : category;
    let current = '';
    let period = '';
    const result: { title: string; details: string[]; section: string; period: string }[] = [];
    for (const line of lines) {
      if (line === 'Penelitian' || line === 'Pengabdian kepada Masyarakat') { current = line; continue; }
      if (/^TS(?:-\d)?\s/.test(line)) { period = line; continue; }
      if (section && current && (section === 'Penelitian' ? current !== 'Penelitian' : current === 'Penelitian')) continue;
      if (/^\d+\. /.test(line)) result.push({ title: line.replace(/^\d+\. /, ''), details: [], section: current, period });
      else if (result.length && current) result[result.length - 1].details.push(line);
    }
    const q = query.trim().toLocaleLowerCase('id');
    return result.filter((entry) => !q || `${entry.title} ${entry.details.join(' ')}`.toLocaleLowerCase('id').includes(q));
  }, [lines, query, category]);

  const researchCount = lines.find((line) => line.includes('31 baris penelitian')) ? 31 : 0;
  const pkmCount = lines.find((line) => line.includes('12 laporan PkM')) ? 12 : 0;

  return (
    <main className="min-h-screen bg-stone-50 text-slate-800">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><img src="/assets/logo-poltek-simas-berau.png" alt="Politeknik Sinar Mas Berau Coal" className="h-12 w-12 object-contain" /><div><div className="font-bold">UPPM Politeknik Sinar Mas Berau Coal</div><div className="text-xs text-slate-500">Informasi publik penelitian dan pengabdian</div></div></div>
          <div className="flex items-center gap-4"><a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-red-800 hover:text-red-950"><ArrowLeft size={16} /> Beranda</a><a href="/login" className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Login</a></div>
        </div>
      </header>
      <section className="bg-gradient-to-br from-red-950 via-red-900 to-amber-800 text-white">
        <div className="max-w-7xl mx-auto px-5 py-14 md:py-20">
          <p className="text-amber-200 text-sm font-semibold tracking-widest uppercase">Rekam jejak tridarma</p>
          <h1 className="mt-3 max-w-3xl text-4xl md:text-6xl font-bold leading-tight">Riset yang tumbuh bersama Berau</h1>
          <p className="mt-5 max-w-2xl text-red-50/90 text-lg">Jelajahi penelitian dosen dan kegiatan pengabdian kepada masyarakat Politeknik Sinar Mas Berau Coal dari tahun ke tahun.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#rekap" className="rounded-lg bg-white px-5 py-3 text-red-900 font-semibold">Jelajahi rekap</a>
            <a href="#dokumentasi" className="rounded-lg border border-white/50 px-5 py-3 font-semibold hover:bg-white/10">Lihat dokumentasi</a>
          </div>
        </div>
      </section>
      <div className="max-w-7xl mx-auto px-5 py-10">
        <div className="grid sm:grid-cols-2 gap-4 -mt-16 relative">
          <div className="rounded-xl bg-white shadow-lg border border-stone-100 p-6 flex items-center gap-4"><span className="rounded-xl bg-red-50 text-red-800 p-3"><FlaskConical /></span><div><div className="text-3xl font-bold">{researchCount || '—'}</div><div className="text-slate-500">Rekap penelitian · TS-2 hingga TS</div></div></div>
          <div className="rounded-xl bg-white shadow-lg border border-stone-100 p-6 flex items-center gap-4"><span className="rounded-xl bg-amber-50 text-amber-800 p-3"><HandHeart /></span><div><div className="text-3xl font-bold">{pkmCount || '—'}</div><div className="text-slate-500">Kegiatan pengabdian terdokumentasi</div></div></div>
        </div>
        <section id="rekap" className="pt-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5"><div><p className="text-sm font-semibold text-red-800">JELAJAHI REKAP</p><h2 className="mt-1 text-3xl font-bold">Penelitian & pengabdian</h2></div><div className="flex flex-col sm:flex-row gap-3"><label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul atau ketua" className="w-full sm:w-64 rounded-lg border border-stone-300 bg-white py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-red-700" /></label><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="rounded-lg border border-stone-300 bg-white px-3 py-2.5"><option>Semua</option><option>Penelitian</option><option>Pengabdian</option></select></div></div>
          <p className="mt-3 text-sm text-slate-500">Rangkuman bersumber dari rekap UPPM yang diserahkan. Keterangan publikasi dan foto mengikuti status verifikasi pada sumber.</p>
          <div className="mt-6 grid lg:grid-cols-2 gap-4">{entries.map((entry, i) => {
            const desc = entry.details.find((item) => item.startsWith('Penelitian ') || item.startsWith('Kajian ') || item.startsWith('Kegiatan ') || item.startsWith('Tim ') || item.startsWith('Aparat ') || item.startsWith('Mahasiswa ') || item.startsWith('Pelatihan ') || item.startsWith('Pengembangan ') || item.startsWith('Pendataan ') || item.startsWith('Pendampingan ') || item.startsWith('Survei '));
            const lead = entry.details.find((item) => item.startsWith('Ketua pada rekap:'))?.replace('Ketua pada rekap: ', '').split('. Bukti:')[0];
            const evidence = entry.details.find((item) => item.startsWith('Tautan bukti:'))?.replace('Tautan bukti: ', '');
            const image = i < gallery.length ? gallery[i] : undefined;
            return <article key={`${entry.title}-${i}`} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm sm:flex">
              {image && <a href={`/assets/research-gallery/${image}`} target="_blank" rel="noreferrer" className="block shrink-0 bg-stone-100 sm:w-40 md:w-48"><img src={`/assets/research-gallery/${image}`} alt="Cuplikan dokumentasi dari rekap" loading="lazy" className="h-48 w-full object-cover sm:h-full sm:min-h-48" /></a>}
              <div className="p-5"><div className="text-xs font-semibold uppercase tracking-wide text-red-800">{entry.section === 'Penelitian' ? (entry.period || 'Penelitian') : 'Pengabdian kepada masyarakat'}</div><h3 className="mt-2 font-bold leading-snug">{entry.title}</h3>{desc && <p className="mt-3 text-sm leading-relaxed text-slate-600">{desc}</p>}{lead && <p className="mt-3 text-xs text-slate-500">Ketua: {lead}</p>}{evidence && <a className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-red-800 hover:underline" href={evidence} target="_blank" rel="noreferrer">Lihat bukti daring <ExternalLink size={14} /></a>}</div>
            </article>;
          })}</div>
          {!entries.length && <p className="mt-8 rounded-lg bg-white p-6 text-slate-500">Belum ada data yang cocok dengan pencarian.</p>}
        </section>
        <div id="dokumentasi" />
        <footer className="mt-16 border-t border-stone-200 py-7 text-sm text-slate-500">UPPM Politeknik Sinar Mas Berau Coal · Informasi publik penelitian dan pengabdian kepada masyarakat.</footer>
      </div>
    </main>
  );
}
