import React from 'react';
import { Award, BarChart3, Bell, CalendarDays, CircleDollarSign, FileCheck2, FileSignature, KeyRound, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { currentUser, isAdmin, logout } = useStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'dosen'] },
    { id: 'monthly-update', label: 'Update Bulanan', icon: CalendarDays, roles: ['dosen'] },
    { id: 'monthly-report', label: 'Laporan Bulanan', icon: BarChart3, roles: ['admin'] },
    { id: 'finance-report', label: 'Laporan Keuangan', icon: CircleDollarSign, roles: ['admin'] },
    { id: 'admin', label: 'Admin', icon: ShieldCheck, roles: ['admin'] },
    { id: 'surat-tugas', label: isAdmin ? 'Validasi Surat Tugas' : 'Ajukan Surat Tugas', icon: FileSignature, roles: ['admin', 'dosen'] },
    { id: 'sinta-verifikator', label: isAdmin ? 'Validasi Data SINTA' : 'Ajukan Data SINTA', icon: FileCheck2, roles: ['admin', 'dosen'] },
    { id: 'klaim', label: isAdmin ? 'Validasi Klaim' : 'Ajukan Klaim', icon: Award, roles: ['admin', 'dosen'] },
    { id: 'account', label: 'Akun Saya', icon: KeyRound, roles: ['admin', 'dosen'] },
  ].filter(item => item.roles.includes(isAdmin ? 'admin' : 'dosen'));

  const handleSelect = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-red-50/40 flex">
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-red-100">
        <div className="p-5 border-b border-red-100">
          <div className="flex items-center gap-3">
            <img src="/assets/logo-poltek-simas-berau.png" alt="Poltek Simas Berau" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Asisten Digital</h1>
              <p className="text-sm font-semibold text-red-700">UPPM Poltek Berau</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-red-100 bg-red-50/60 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 truncate">{currentUser?.nama}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{currentUser?.role}</p>
          </div>
          <NotificationBell />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-red-700 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-red-50 hover:text-red-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-red-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-red-100">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-800 transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-red-100 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/assets/logo-poltek-simas-berau.png" alt="Poltek Simas Berau" className="h-10 w-10 object-contain" />
          <h1 className="text-base font-bold text-slate-900">UPPM</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-40 border-t border-red-100">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-lg transition-colors ${
                    isActive ? 'bg-red-700 text-white font-semibold' : 'text-slate-600 hover:bg-red-50 hover:text-red-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-4 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-800">
              <LogOut className="w-5 h-5" />
              <span>Keluar</span>
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 md:pt-0 pt-16">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
