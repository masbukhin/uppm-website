import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpenCheck, CalendarClock, ExternalLink, FileCheck2, FileSignature, FlaskConical, Globe2,
  HandHeart, LogIn, Megaphone, Menu, Newspaper, Pin, QrCode, Search, Users, Wallet, X,
} from 'lucide-react';
import { historicalProjects } from '../data/historicalProjects';
import { getPublicHome } from '../services/publicContentApi';
import type { PublicPost, PublicStats } from '../types';

const NAV = [
  { href: '#beranda', label: 'Beranda' },
  { href: '#pengumuman', label: 'Pengumuman' },
  { href: '#pendanaan', label: 'Sumber Dana' },
  { href: '#statistik', label: 'Statistik' },
  { href: '/riset', label: 'Rekap Riset' },
  { href: '/verify', label: 'Verifikasi Dokumen' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fundingStatus(post: PublicPost) {
  const today = todayIso();
  if (post.tenggat && post.tenggat < today) return { label: 'Ditutup', className: 'bg-slate-100 text-slate-500' };
  if (post.tanggalBuka && post.tanggalBuka > today) return { label: 'Segera dibuka', className: 'bg-amber-100 text-amber-800' };
  if (post.tanggalBuka || post.tenggat) return { label: 'Dibuka', className: 'bg-emerald-100 text-emerald-800' };
  return { label: 'Cek laman resmi', className: 'bg-sky-100 text-sky-800' };
}

const goLogin = () => { window.location.href = '/login'; };

export default function PublicHome() {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<PublicPost | null>(null);
  const [scope, setScope] = useState<'Semua' | 'Nasional' | 'Internasional' | 'Internal'>('Semua');
  const [query, setQuery] = useState('');
  const [showAllNews, setShowAllNews] = useState(false);

  useEffect(() => {
    getPublicHome().then(result => {
      if (result.ok) { setPosts(result.posts); setStats(result.stats); } else setLoadError(result.error);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const announcements = posts.filter(post => post.kind === 'pengumuman');
  const news = posts.filter(post => post.kind === 'berita');
  const pinned = announcements.find(post => post.isPinned) || announcements[0];

  const funding = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('id');
    return posts
      .filter(post => post.kind === 'pendanaan')
      .filter(post => scope === 'Semua' || post.lingkup === scope)
      .filter(post => !q || `${post.judul} ${post.penyelenggara} ${post.skema}`.toLocaleLowerCase('id').includes(q))
      .sort((a, b) => {
        const closedA = fundingStatus(a).label === 'Ditutup' ? 1 : 0;
        const closedB = fundingStatus(b).label === 'Ditutup' ? 1 : 0;
        if (closedA !== closedB) return closedA - closedB;
        return (a.tenggat || '9999').localeCompare(b.tenggat || '9999');
      });
  }, [posts, scope, query]);

  const counters = useMemo(() => {
    const histResearch = historicalProjects.filter(item => item.kategori === 'Penelitian').length;
    const histService = historicalProjects.filter(item => item.kategori === 'Pengabdian').length;
    const openFunding = posts.filter(post => post.kind === 'pendanaan' && fundingStatus(post).label !== 'Ditutup').length;
    return [
      { label: 'Penelitian tercatat', value: histResearch + (stats?.penelitian || 0), icon: FlaskConical },
      { label: 'Pengabdian masyarakat', value: histService + (stats?.pengabdian || 0), icon: HandHeart },
      { label: 'Publikasi dosen', value: stats?.publikasi || 0, icon: BookOpenCheck },
      { label: 'Dosen terdaftar', value: stats?.dosen || 0, icon: Users },
      { label: 'Peluang pendanaan aktif', value: openFunding, icon: Wallet },
    ];
  }, [posts, stats]);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <a href="#beranda" className="flex min-w-0 items-center gap-3">
            <img src="/assets/logo-poltek-simas-berau.png" alt="Politeknik Sinar Mas Berau Coal" className="h-11 w-11 shrink-0 object-contain" />
            <div className="min-w-0">
              <div className="truncate font-bold leading-tight text-slate-900">UPPM Poltek Simas Berau</div>
              <div className="truncate text-xs text-slate-500">Unit Penelitian dan Pengabdian Masyarakat</div>
            </div>
          </a>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map(item => <a key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-800">{item.label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={goLogin} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-800">
              <LogIn size={16} /> <span>Login</span>
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-md p-2 text-slate-600 lg:hidden" aria-label="Menu">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-stone-200 bg-white px-4 py-2 lg:hidden">
            {NAV.map(item => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-red-50">{item.label}</a>)}
          </nav>
        )}
      </header>

      <section id="beranda" className="bg-gradient-to-br from-red-950 via-red-900 to-amber-800 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-5 md:py-20 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-200">Politeknik Sinar Mas Berau Coal</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">Pusat informasi penelitian dan pengabdian masyarakat</h1>
            <p className="mt-5 max-w-2xl text-lg text-red-50/90">Temukan pengumuman, peluang pendanaan hibah nasional dan internasional, serta rekam jejak riset dosen Poltek Simas Berau.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#pendanaan" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-red-900 hover:bg-red-50">Lihat sumber dana <ArrowRight size={18} /></a>
              <a href="#pengumuman" className="rounded-lg border border-white/50 px-5 py-3 font-semibold hover:bg-white/10">Pengumuman terbaru</a>
            </div>
          </div>
          {pinned && (
            <button onClick={() => setSelected(pinned)} className="group rounded-2xl bg-white/10 p-6 text-left ring-1 ring-white/20 backdrop-blur hover:bg-white/15">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-950"><Pin size={12} /> Pengumuman utama</span>
              <h2 className="mt-4 text-2xl font-bold leading-snug">{pinned.judul}</h2>
              {pinned.ringkasan && <p className="mt-3 text-red-50/90">{pinned.ringkasan}</p>}
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-200 group-hover:underline">Baca selengkapnya <ArrowRight size={16} /></span>
            </button>
          )}
        </div>
      </section>

      <section id="statistik" className="mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-5">
        <div className="relative -mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
          {counters.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-stone-100 bg-white p-5 shadow-lg">
              <Icon className="text-red-700" size={22} />
              <div className="mt-3 text-3xl font-bold text-slate-900">{isLoading ? '…' : value.toLocaleString('id-ID')}</div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {loadError && <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-5"><p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{loadError}</p></div>}

      <section id="pengumuman" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-5">
        <SectionTitle icon={Megaphone} eyebrow="Informasi terbaru" title="Pengumuman" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {announcements.map(post => (
            <article key={post.id} className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              {post.gambar && <img src={post.gambar} alt="" loading="lazy" className="h-44 w-full object-cover" />}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-800">
                  {post.isPinned && <Pin size={12} />}<CalendarClock size={13} /> {formatDate(post.publishedAt)}
                </div>
                <h3 className="mt-2 font-bold leading-snug text-slate-900">{post.judul}</h3>
                {post.ringkasan && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.ringkasan}</p>}
                <button onClick={() => setSelected(post)} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-red-800 hover:underline">Baca selengkapnya <ArrowRight size={14} /></button>
              </div>
            </article>
          ))}
        </div>
        {!isLoading && !announcements.length && <Empty text="Belum ada pengumuman." />}
      </section>

      <section id="pendanaan" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionTitle icon={Wallet} eyebrow="Daftar sumber dana riset" title="Peluang pendanaan & hibah" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex rounded-lg bg-stone-200/70 p-1">
              {(['Semua', 'Nasional', 'Internasional', 'Internal'] as const).map(option => (
                <button key={option} onClick={() => setScope(option)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${scope === option ? 'bg-white text-red-800 shadow-sm' : 'text-slate-600'}`}>{option}</button>
              ))}
            </div>
            <label className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari program / penyelenggara" className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-red-700 sm:w-64" />
            </label>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[2fr_1.4fr_1.3fr_auto] gap-4 border-b border-stone-200 bg-stone-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <span>Program</span><span>Penyelenggara</span><span>Periode</span><span className="w-32 text-right">Status</span>
          </div>
          {funding.map(post => {
            const status = fundingStatus(post);
            return (
              <div key={post.id} className="grid gap-2 border-b border-stone-100 px-5 py-4 last:border-0 md:grid-cols-[2fr_1.4fr_1.3fr_auto] md:items-center md:gap-4">
                <div>
                  <button onClick={() => setSelected(post)} className="text-left font-semibold text-slate-900 hover:text-red-800">{post.judul}</button>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    {post.lingkup && <span className="inline-flex items-center gap-1"><Globe2 size={12} /> {post.lingkup}</span>}
                    {post.skema && <span>· {post.skema}</span>}
                  </div>
                </div>
                <div className="text-sm text-slate-600">{post.penyelenggara || '—'}</div>
                <div className="text-sm text-slate-600">
                  {post.periode || '—'}
                  {post.tenggat && <div className="text-xs text-slate-400">Tenggat: {formatDate(post.tenggat)}</div>}
                </div>
                <div className="flex items-center gap-3 md:w-32 md:flex-col md:items-end md:gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                  {post.tautan && <a href={post.tautan} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-red-800 hover:underline">Laman resmi <ExternalLink size={12} /></a>}
                </div>
              </div>
            );
          })}
          {!isLoading && !funding.length && <p className="p-6 text-sm text-slate-500">Tidak ada sumber dana yang cocok.</p>}
        </div>
        <p className="mt-3 text-xs text-slate-500">Jadwal dapat berubah sewaktu-waktu. Selalu pastikan kembali melalui laman resmi penyelenggara.</p>
      </section>

      {news.length > 0 && (
        <section id="berita" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-5">
          <SectionTitle icon={Newspaper} eyebrow="Kegiatan UPPM" title="Berita" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(showAllNews ? news : news.slice(0, 6)).map(post => (
              <button key={post.id} onClick={() => setSelected(post)} className="overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-sm hover:shadow-md">
                {post.gambar && <img src={post.gambar} alt="" loading="lazy" className="h-44 w-full object-cover" />}
                <div className="p-5"><div className="text-xs text-slate-500">{formatDate(post.publishedAt)}</div><h3 className="mt-1 font-bold leading-snug">{post.judul}</h3>{post.ringkasan && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{post.ringkasan}</p>}</div>
              </button>
            ))}
          </div>
          {news.length > 6 && !showAllNews && <button onClick={() => setShowAllNews(true)} className="mt-4 text-sm font-semibold text-red-800 hover:underline">Tampilkan semua berita</button>}
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-5">
        <SectionTitle icon={FileSignature} eyebrow="Untuk dosen" title="Layanan UPPM" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileSignature, title: 'Surat Tugas', text: 'Ajukan surat tugas penelitian dan pengabdian.', action: goLogin },
            { icon: FileCheck2, title: 'Verifikasi SINTA', text: 'Ajukan validasi data kinerja SINTA.', action: goLogin },
            { icon: Wallet, title: 'Klaim Publikasi', text: 'Rencana submit dan reimburse publikasi.', action: goLogin },
            { icon: QrCode, title: 'Cek Keaslian Dokumen', text: 'Verifikasi dokumen UPPM lewat kode QR.', action: () => { window.location.href = '/verify'; } },
          ].map(({ icon: Icon, title, text, action }) => (
            <button key={title} onClick={action} className="rounded-xl border border-stone-200 bg-white p-5 text-left shadow-sm hover:border-red-200 hover:shadow-md">
              <span className="inline-flex rounded-lg bg-red-50 p-2.5 text-red-800"><Icon size={20} /></span>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </button>
          ))}
        </div>
      </section>

      <footer className="mt-20 bg-red-950 text-red-50/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:px-5 md:grid-cols-3">
          <div>
            <div className="font-bold text-white">UPPM Politeknik Sinar Mas Berau Coal</div>
            <p className="mt-2">Unit Penelitian dan Pengabdian kepada Masyarakat. Tanjung Redeb, Berau, Kalimantan Timur.</p>
          </div>
          <div>
            <div className="font-semibold text-white">Tautan</div>
            <ul className="mt-2 space-y-1">{NAV.map(item => <li key={item.href}><a className="hover:text-white" href={item.href}>{item.label}</a></li>)}</ul>
          </div>
          <div>
            <div className="font-semibold text-white">Portal dosen</div>
            <p className="mt-2">Masuk untuk mengajukan surat tugas, verifikasi SINTA, dan klaim publikasi.</p>
            <button onClick={goLogin} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-red-900"><LogIn size={16} /> Login</button>
          </div>
        </div>
      </footer>

      {selected && <PostDialog post={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SectionTitle({ icon: Icon, eyebrow, title }: { icon: typeof Megaphone; eyebrow: string; title: string }) {
  return (
    <div>
      <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-800"><Icon size={16} /> {eyebrow}</p>
      <h2 className="mt-1 text-3xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-6 rounded-lg border border-stone-200 bg-white p-6 text-sm text-slate-500">{text}</p>;
}

function PostDialog({ post, onClose }: { post: PublicPost; onClose: () => void }) {
  const facts = [
    ['Penyelenggara', post.penyelenggara], ['Skema', post.skema], ['Lingkup', post.lingkup], ['Periode', post.periode],
    ['Dibuka', formatDate(post.tanggalBuka)], ['Tenggat', formatDate(post.tenggat)], ['Kontak', post.kontak],
  ].filter(([, value]) => value);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={post.judul}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" onClick={event => event.stopPropagation()}>
        {post.gambar && <img src={post.gambar} alt="" className="max-h-80 w-full object-cover" />}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-800">{post.kind === 'pendanaan' ? 'Sumber dana' : post.kind} · {formatDate(post.publishedAt)}</p>
              <h2 className="mt-1 text-2xl font-bold leading-snug text-slate-900">{post.judul}</h2>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-stone-100" aria-label="Tutup"><X size={20} /></button>
          </div>
          {post.ringkasan && <p className="mt-4 text-slate-700">{post.ringkasan}</p>}
          {facts.length > 0 && (
            <dl className="mt-5 grid gap-x-6 gap-y-2 rounded-lg bg-stone-50 p-4 text-sm sm:grid-cols-2">
              {facts.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="font-medium text-slate-800">{value}</dd></div>)}
            </dl>
          )}
          {post.isi && <div className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700">{post.isi}</div>}
          <div className="mt-6 flex flex-wrap gap-3">
            {post.tautan && <a href={post.tautan} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Laman resmi <ExternalLink size={14} /></a>}
            {post.sumber && <a href={post.sumber} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-50">Sumber informasi <ExternalLink size={14} /></a>}
          </div>
        </div>
      </div>
    </div>
  );
}
