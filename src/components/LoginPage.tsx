import { useEffect, useState, type FormEvent } from 'react';
import { LockKeyhole, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { UserRole } from '../types';

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
    onTurnstileExpired?: () => void;
    turnstile?: {
      reset: () => void;
    };
  }
}

export default function LoginPage() {
  const { createInitialAdmin, databaseError, hasAdminAccount, isDatabaseLoading, login } = useStore();
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('Administrator UPPM');
  const [humanToken, setHumanToken] = useState('');
  const [fallbackHumanCheck, setFallbackHumanCheck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('dosen');

  const humanVerified = turnstileSiteKey ? Boolean(humanToken) : fallbackHumanCheck;

  useEffect(() => {
    if (!turnstileSiteKey) return;

    window.onTurnstileSuccess = (token: string) => setHumanToken(token);
    window.onTurnstileExpired = () => setHumanToken('');

    if (!document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [turnstileSiteKey]);

  const resetTurnstile = () => {
    setHumanToken('');
    window.turnstile?.reset();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (isDatabaseLoading) {
      setError('Database masih dimuat. Tunggu sebentar lalu coba lagi.');
      return;
    }

    if (databaseError) {
      setError(databaseError);
      return;
    }

    if (!humanVerified) {
      setError('Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    try {
      // The Turnstile token is verified by the server as part of login/setup.
      const turnstileToken = turnstileSiteKey ? humanToken : undefined;
      const result = hasAdminAccount
        ? await login(username, password, selectedRole, turnstileToken)
        : await createInitialAdmin({ username, password, nama: adminName, turnstileToken });

      if (!result.ok) {
        setError(result.error || 'Proses gagal.');
        resetTurnstile();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_420px] bg-white border border-red-100 shadow-xl rounded-lg overflow-hidden">
        <section className="bg-red-700 text-white p-8 lg:p-10 flex flex-col justify-between min-h-[420px]">
          <div>
            <img src="/assets/logo-poltek-simas-berau.png" alt="Poltek Simas Berau" className="h-24 w-24 object-contain bg-white rounded-md p-2" />
            <h1 className="mt-8 text-3xl font-bold leading-tight">Asisten Digital UPPM</h1>
            <p className="mt-3 text-red-50 max-w-xl">
              Sistem pengajuan surat tugas, verifikasi SINTA, klaim publikasi, dan monitoring data dosen Politeknik Sinar Mas Berau Coal.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-red-50">
            <div className="border border-white/20 rounded-md p-3">
              <p className="font-semibold text-white">Admin</p>
              <p>Cek input dan kelola akun dosen.</p>
            </div>
            <div className="border border-white/20 rounded-md p-3">
              <p className="font-semibold text-white">Dosen</p>
              <p>Pantau dashboard dan status pengajuan sendiri.</p>
            </div>
          </div>
          <a href="/riset" className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-red-800 hover:bg-red-50">
            Lihat rekap penelitian & pengabdian <span aria-hidden="true">→</span>
          </a>
        </section>

        <section className="p-8 lg:p-10">
          <a href="/" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-red-800 hover:underline"><span aria-hidden="true">←</span> Kembali ke beranda</a>
          <h2 className="text-2xl font-bold text-slate-900">{hasAdminAccount ? 'Masuk Aplikasi' : 'Setup Admin Awal'}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isDatabaseLoading ? 'Memuat akun dari MySQL...' : databaseError ? 'Koneksi MySQL belum tersedia.' : hasAdminAccount ? 'Gunakan akun resmi yang dibuat admin UPPM.' : 'Buat akun admin pertama untuk database aplikasi ini.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {hasAdminAccount && (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1" aria-label="Pilih jenis login">
                <button type="button" onClick={() => { setSelectedRole('admin'); setError(''); }} className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${selectedRole === 'admin' ? 'bg-red-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>Login Admin</button>
                <button type="button" onClick={() => { setSelectedRole('dosen'); setError(''); }} className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${selectedRole === 'dosen' ? 'bg-red-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>Login Dosen</button>
              </div>
            )}
            {!hasAdminAccount && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nama Admin</label>
                <input
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Nama pengelola UPPM"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Username"
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Password"
                  autoComplete={hasAdminAccount ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ShieldCheck className="h-4 w-4 text-red-700" />
                <span>Verifikasi keamanan</span>
              </div>
              {turnstileSiteKey ? (
                <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onTurnstileSuccess" data-expired-callback="onTurnstileExpired" data-error-callback="onTurnstileExpired" />
              ) : (
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={fallbackHumanCheck} onChange={(event) => setFallbackHumanCheck(event.target.checked)} className="h-4 w-4 accent-red-700" />
                  <span>Saya pengguna manusia dan memahami akses ini hanya untuk pengguna resmi.</span>
                </label>
              )}
            </div>

            {(error || databaseError) && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{error || databaseError}</div>}

            <button type="submit" disabled={!humanVerified || isSubmitting || isDatabaseLoading || Boolean(databaseError)} className="w-full py-3 bg-red-700 text-white rounded-lg font-semibold hover:bg-red-800 transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
              <LogIn className="w-5 h-5" />
              <span>{isDatabaseLoading ? 'Memuat database...' : isSubmitting ? 'Memverifikasi...' : hasAdminAccount ? `Masuk sebagai ${selectedRole === 'admin' ? 'Admin' : 'Dosen'}` : 'Buat Admin'}</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
