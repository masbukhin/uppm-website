import { useState, type FormEvent } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function ChangePasswordForm() {
  const { changeOwnPassword, currentUser } = useStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ ok: false, text: 'Konfirmasi password baru tidak sama.' });
      return;
    }
    setIsSaving(true);
    const result = await changeOwnPassword(currentPassword, newPassword);
    setIsSaving(false);
    setMessage(result.ok ? { ok: true, text: 'Password berhasil diganti.' } : { ok: false, text: result.error || 'Gagal mengganti password.' });
    if (result.ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500';

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Akun Saya</h2>
        <p className="text-slate-500 mt-1">{currentUser?.nama} · {currentUser?.username}</p>
      </div>
      <section className="bg-white border border-red-100 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-5 h-5 text-red-700" />
          <h3 className="font-bold text-slate-900">Ganti Password</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2 text-sm font-semibold text-slate-700">Password lama
            <input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} />
          </label>
          <label className="block space-y-2 text-sm font-semibold text-slate-700">Password baru
            <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} placeholder="Minimal 8 karakter" />
          </label>
          <label className="block space-y-2 text-sm font-semibold text-slate-700">Ulangi password baru
            <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
          </label>
          {message && (
            <p aria-live="polite" className={`text-sm rounded-lg p-3 border ${message.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`}>{message.text}</p>
          )}
          <button type="submit" disabled={isSaving} className="w-full px-5 py-3 bg-red-700 text-white rounded-lg font-semibold hover:bg-red-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-5 h-5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Password'}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
