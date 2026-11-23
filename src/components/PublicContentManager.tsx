import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Eye, EyeOff, Globe, Pencil, Pin, Plus, Save, Trash2, X } from 'lucide-react';
import { deletePost, listAllPosts, savePost } from '../services/publicContentApi';
import type { PublicPost, PublicPostKind } from '../types';

const KIND_LABEL: Record<PublicPostKind, string> = { pengumuman: 'Pengumuman', pendanaan: 'Sumber Dana', berita: 'Berita' };

const emptyPost = (kind: PublicPostKind): Partial<PublicPost> => ({
  kind, judul: '', ringkasan: '', isi: '', penyelenggara: '', skema: '', lingkup: kind === 'pendanaan' ? 'Nasional' : '',
  periode: '', kontak: '', tanggalBuka: '', tenggat: '', tautan: '', gambar: '', sumber: '',
  publishedAt: new Date().toISOString().slice(0, 10), isPublished: true, isPinned: false,
});

const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500';

export default function PublicContentManager() {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [filter, setFilter] = useState<PublicPostKind | 'semua'>('semua');
  const [draft, setDraft] = useState<Partial<PublicPost> | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const result = await listAllPosts();
    if (result.ok) setPosts(result.posts); else setError(result.error);
  };

  useEffect(() => { void reload(); }, []);

  const set = <K extends keyof PublicPost>(key: K, value: PublicPost[K]) => setDraft(current => current && { ...current, [key]: value });

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setBusy(true); setError(''); setMessage('');
    const result = await savePost(draft);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    setMessage(`Tersimpan: ${result.post.judul}`);
    setDraft(null);
    await reload();
  };

  const quickUpdate = async (post: PublicPost, patch: Partial<PublicPost>) => {
    setError('');
    const result = await savePost({ ...post, ...patch });
    if (!result.ok) setError(result.error); else await reload();
  };

  const handleDelete = async (post: PublicPost) => {
    if (!window.confirm(`Hapus "${post.judul}" dari website publik?`)) return;
    const result = await deletePost(post.id);
    if (!result.ok) setError(result.error); else { setMessage('Konten dihapus.'); await reload(); }
  };

  const visible = posts.filter(post => filter === 'semua' || post.kind === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Konten Website Publik</h2>
          <p className="text-sm text-slate-500">Kelola pengumuman, sumber dana riset, dan berita di halaman depan UPPM.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Globe size={16} /> Lihat halaman depan</a>
          {(Object.keys(KIND_LABEL) as PublicPostKind[]).map(kind => (
            <button key={kind} onClick={() => { setDraft(emptyPost(kind)); setMessage(''); }} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"><Plus size={16} /> {KIND_LABEL[kind]}</button>
          ))}
        </div>
      </div>

      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {draft && (
        <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">{draft.id ? 'Ubah' : 'Tambah'} {KIND_LABEL[draft.kind as PublicPostKind]}</h3>
            <button type="button" onClick={() => setDraft(null)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Batal"><X size={18} /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Judul *" wide><input required minLength={3} value={draft.judul} onChange={e => set('judul', e.target.value)} className={inputClass} /></Field>
            <Field label="Ringkasan (tampil di kartu)" wide><textarea rows={2} value={draft.ringkasan} onChange={e => set('ringkasan', e.target.value)} className={inputClass} /></Field>
            <Field label="Isi lengkap" wide><textarea rows={6} value={draft.isi} onChange={e => set('isi', e.target.value)} className={inputClass} /></Field>
            <Field label="Penyelenggara"><input value={draft.penyelenggara} onChange={e => set('penyelenggara', e.target.value)} className={inputClass} /></Field>
            {draft.kind === 'pendanaan' && <>
              <Field label="Lingkup"><select value={draft.lingkup} onChange={e => set('lingkup', e.target.value)} className={inputClass}><option>Nasional</option><option>Internasional</option><option>Internal</option></select></Field>
              <Field label="Skema"><input value={draft.skema} onChange={e => set('skema', e.target.value)} className={inputClass} /></Field>
              <Field label="Periode (teks)"><input value={draft.periode} onChange={e => set('periode', e.target.value)} placeholder="mis. Desember 2026 – Februari 2027" className={inputClass} /></Field>
              <Field label="Tanggal dibuka"><input type="date" value={draft.tanggalBuka} onChange={e => set('tanggalBuka', e.target.value)} className={inputClass} /></Field>
              <Field label="Tenggat"><input type="date" value={draft.tenggat} onChange={e => set('tenggat', e.target.value)} className={inputClass} /></Field>
            </>}
            <Field label="Tautan laman resmi"><input type="url" value={draft.tautan} onChange={e => set('tautan', e.target.value)} placeholder="https://" className={inputClass} /></Field>
            <Field label="URL gambar / poster"><input value={draft.gambar} onChange={e => set('gambar', e.target.value)} placeholder="https:// atau /assets/..." className={inputClass} /></Field>
            <Field label="Sumber informasi"><input type="url" value={draft.sumber} onChange={e => set('sumber', e.target.value)} placeholder="https://" className={inputClass} /></Field>
            <Field label="Kontak"><input value={draft.kontak} onChange={e => set('kontak', e.target.value)} className={inputClass} /></Field>
            <Field label="Tanggal terbit"><input type="date" value={draft.publishedAt} onChange={e => set('publishedAt', e.target.value)} className={inputClass} /></Field>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-slate-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(draft.isPublished)} onChange={e => set('isPublished', e.target.checked)} className="h-4 w-4 accent-red-700" /> Tampilkan di website</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(draft.isPinned)} onChange={e => set('isPinned', e.target.checked)} className="h-4 w-4 accent-red-700" /> Sematkan di atas</label>
          </div>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"><Save size={16} /> {busy ? 'Menyimpan…' : 'Simpan'}</button>
        </form>
      )}

      <div className="flex gap-2">
        {(['semua', ...Object.keys(KIND_LABEL)] as const).map(kind => (
          <button key={kind} onClick={() => setFilter(kind as PublicPostKind | 'semua')} className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === kind ? 'bg-red-700 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            {kind === 'semua' ? 'Semua' : KIND_LABEL[kind as PublicPostKind]} ({kind === 'semua' ? posts.length : posts.filter(post => post.kind === kind).length})
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-red-100 bg-white">
        {visible.map(post => (
          <div key={post.id} className="flex flex-col gap-3 border-b border-red-50 p-4 last:border-0 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-red-50 px-2 py-0.5 font-semibold text-red-800">{KIND_LABEL[post.kind]}</span>
                {post.isPinned && <span className="inline-flex items-center gap-1 text-amber-700"><Pin size={12} /> Disematkan</span>}
                {!post.isPublished && <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500">Draf</span>}
                <span className="text-slate-400">{post.publishedAt}{post.tenggat ? ` · tenggat ${post.tenggat}` : ''}</span>
              </div>
              <p className="mt-1 truncate font-semibold text-slate-900">{post.judul}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <IconButton title={post.isPublished ? 'Sembunyikan' : 'Tampilkan'} onClick={() => quickUpdate(post, { isPublished: !post.isPublished })}>{post.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}</IconButton>
              <IconButton title={post.isPinned ? 'Lepas sematan' : 'Sematkan'} onClick={() => quickUpdate(post, { isPinned: !post.isPinned })}><Pin size={16} /></IconButton>
              <IconButton title="Ubah" onClick={() => { setDraft({ ...post }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={16} /></IconButton>
              <IconButton title="Hapus" onClick={() => handleDelete(post)} danger><Trash2 size={16} /></IconButton>
            </div>
          </div>
        ))}
        {!visible.length && <p className="p-6 text-sm text-slate-500">Belum ada konten.</p>}
      </div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <label className={`space-y-1 ${wide ? 'md:col-span-2' : ''}`}><span className="text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}

function IconButton({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} className={`rounded-md border border-slate-200 p-2 ${danger ? 'text-red-700 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}>{children}</button>;
}
