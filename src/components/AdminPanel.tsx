import { useMemo, useState, type FormEvent } from 'react';
import { Save, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { getLecturerDisplay } from '../data/lecturers';
import { useStore } from '../store/useStore';

export default function AdminPanel() {
  const { accounts, allClaimSubmissions, allSintaVerifications, allSuratTugas, createDosenAccount, deleteAccount, lecturerProfiles } = useStore();
  const firstLecturer = lecturerProfiles[0]?.id || '';
  const [dosenId, setDosenId] = useState(firstLecturer);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const dosenAccounts = accounts.filter(account => account.role === 'dosen');
  const accountDosenIds = useMemo(() => new Set(dosenAccounts.map(account => account.dosenId).filter(Boolean)), [dosenAccounts]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = createDosenAccount({ dosenId, username, password });
    setMessage(result.ok ? 'Akun dosen berhasil dibuat.' : result.error || 'Gagal membuat akun.');
    if (result.ok) {
      setUsername('');
      setPassword('');
    }
  };

  const activityRows = [
    ...allSuratTugas.map(item => ({ id: item.id, jenis: 'Surat Tugas', nama: item.ownerName || item.ketua, judul: item.namaKegiatan, status: item.status })),
    ...allSintaVerifications.map(item => ({ id: item.id, jenis: 'SINTA', nama: item.ownerName || item.namaPengaju, judul: item.fields?.judul || item.jenisData, status: item.status })),
    ...allClaimSubmissions.map(item => ({ id: item.id, jenis: 'Klaim', nama: item.ownerName || item.namaPengaju, judul: item.judul, status: item.status })),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Panel Admin</h2>
        <p className="text-slate-500 mt-1">Buat akun dosen dari daftar CSV dan pantau semua pengajuan yang masuk.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
        <section className="bg-white border border-red-100 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="w-5 h-5 text-red-700" />
            <h3 className="font-bold text-slate-900">Buat Akun Dosen</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Dosen</label>
              <select value={dosenId} onChange={(event) => setDosenId(event.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                {lecturerProfiles.map(dosen => (
                  <option key={dosen.id} value={dosen.id}>{getLecturerDisplay(dosen)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Username</label>
                <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="contoh: kris" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <input value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
              </div>
            </div>
            {message && <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3">{message}</p>}
            <button type="submit" className="w-full px-5 py-3 bg-red-700 text-white rounded-lg font-semibold hover:bg-red-800 transition-colors flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              <span>Simpan Akun</span>
            </button>
          </form>
        </section>

        <section className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-red-700" />
              <h3 className="font-bold text-slate-900">Akun Dosen</h3>
            </div>
            <span className="text-sm text-slate-500">{dosenAccounts.length} akun aktif</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="p-4 font-semibold">Nama</th>
                  <th className="p-4 font-semibold">Username</th>
                  <th className="p-4 font-semibold">NUPTK</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dosenAccounts.map(account => (
                  <tr key={account.id}>
                    <td className="p-4 font-medium text-slate-800">{account.nama}</td>
                    <td className="p-4 text-slate-600">{account.username}</td>
                    <td className="p-4 text-slate-600">{account.nuptk}</td>
                    <td className="p-4 text-slate-600">{accountDosenIds.has(account.dosenId) ? 'Aktif' : 'Belum lengkap'}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => deleteAccount(account.id)} className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Semua Input Dosen</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="p-4 font-semibold">Jenis</th>
                <th className="p-4 font-semibold">Dosen</th>
                <th className="p-4 font-semibold">Judul/Kegiatan</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityRows.map(row => (
                <tr key={`${row.jenis}-${row.id}`}>
                  <td className="p-4 text-red-700 font-semibold">{row.jenis}</td>
                  <td className="p-4 text-slate-700">{row.nama}</td>
                  <td className="p-4 text-slate-600 max-w-xl truncate">{row.judul}</td>
                  <td className="p-4 text-slate-600">{row.status}</td>
                </tr>
              ))}
              {activityRows.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Belum ada input dosen.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
