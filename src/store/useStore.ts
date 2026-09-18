import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { lecturerProfiles } from '../data/lecturers';
import { normalizeProdi } from '../data/prodi';
import { loadDatabaseSnapshot, queueDatabaseSync } from '../services/databaseSync';
import { ClaimSubmission, FinalDocument, MonthlyResearchUpdate, Notification, OwnedRecord, Project, Publication, SintaVerification, SuratKeterangan, SuratTugas, UserAccount } from '../types';

type StoreValue = ReturnType<typeof useStoreState>;
type DatabaseSnapshot = {
  accounts?: UserAccount[];
  projects?: Project[];
  publications?: Publication[];
  surat?: SuratKeterangan[];
  suratTugas?: SuratTugas[];
  sintaVerifications?: SintaVerification[];
  claimSubmissions?: ClaimSubmission[];
  monthlyUpdates?: MonthlyResearchUpdate[];
  notifications?: Notification[];
};

const StoreContext = createContext<StoreValue | null>(null);

const legacyCredential = (codes: number[]) => String.fromCharCode(...codes);
const unsafeDemoCredentials = new Set([
  `${legacyCredential([97, 100, 109, 105, 110])}:${legacyCredential([97, 100, 109, 105, 110, 49, 50, 51])}`,
  `${legacyCredential([100, 111, 115, 101, 110])}:${legacyCredential([100, 111, 115, 101, 110, 49, 50, 51])}`,
]);

function readStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch (error) {
    console.warn(`Gagal membaca data ${key} dari localStorage.`, error);
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Gagal menyimpan data ${key} ke localStorage.`, error);
  }
}

function normalizeOwnedProdi<T extends { prodi?: string }>(items: T[]): T[] {
  return items.map(item => item.prodi ? { ...item, prodi: normalizeProdi(item.prodi) } : item);
}

function sanitizeAccounts(items: UserAccount[] = []) {
  return normalizeOwnedProdi(items)
    .filter(account => !unsafeDemoCredentials.has(`${account.username}:${account.password}`));
}

function createFinalDocument(
  type: FinalDocument['type'],
  title: string,
  number: string,
  snapshot: Record<string, unknown>,
  approvedBy: string,
): FinalDocument {
  const approvedAt = new Date().toISOString();
  const uniqueToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const documentId = `doc-${type}-${uniqueToken}`;
  const barcodePayload = `${documentId}|${type}|${number}|${title}|${approvedAt}|${approvedBy}`;

  return {
    id: documentId,
    type,
    title,
    number,
    approvedAt,
    approvedBy,
    barcodePayload,
    snapshot,
  };
}

function useStoreState() {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [isDatabaseLoading, setIsDatabaseLoading] = useState(true);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return readStorage<string | null>('uppm_current_user_id', null);
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [surat, setSurat] = useState<SuratKeterangan[]>([]);
  const [suratTugas, setSuratTugas] = useState<SuratTugas[]>([]);
  const [sintaVerifications, setSintaVerifications] = useState<SintaVerification[]>([]);
  const [claimSubmissions, setClaimSubmissions] = useState<ClaimSubmission[]>([]);
  const [monthlyUpdates, setMonthlyUpdates] = useState<MonthlyResearchUpdate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const currentUser = accounts.find(account => account.id === currentUserId) || null;
  const isAdmin = currentUser?.role === 'admin';
  const hasAdminAccount = accounts.some(account => account.role === 'admin');

  const withOwner = <T extends object>(payload: T): T & OwnedRecord => {
    if (!currentUser) return payload;

    return {
      ...payload,
      ownerId: currentUser.id,
      ownerName: currentUser.nama,
      ownerNuptk: currentUser.nuptk,
    };
  };

  const canSee = (record: OwnedRecord) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return record.ownerId === currentUser.id;
  };

  const visibleProjects = projects.filter(canSee);
  const visiblePublications = publications.filter(canSee);
  const visibleSurat = surat.filter(canSee);
  const visibleSuratTugas = suratTugas.filter(canSee);
  const visibleSintaVerifications = sintaVerifications.filter(canSee);
  const visibleClaimSubmissions = claimSubmissions.filter(canSee);
  const visibleMonthlyUpdates = monthlyUpdates.filter(canSee);

  useEffect(() => {
    let cancelled = false;

    loadDatabaseSnapshot<DatabaseSnapshot>()
      .then(snapshot => {
        if (cancelled || !snapshot) return;

        setAccounts(sanitizeAccounts(snapshot.accounts || []));
        setProjects(normalizeOwnedProdi(snapshot.projects || []));
        setPublications(snapshot.publications || []);
        setSurat(normalizeOwnedProdi(snapshot.surat || []));
        setSuratTugas(normalizeOwnedProdi(snapshot.suratTugas || []));
        setSintaVerifications(normalizeOwnedProdi(snapshot.sintaVerifications || []));
        setClaimSubmissions(normalizeOwnedProdi(snapshot.claimSubmissions || []));
        setMonthlyUpdates(normalizeOwnedProdi(snapshot.monthlyUpdates || []));
        setNotifications(snapshot.notifications || []);
        setDatabaseError('');
        setIsDatabaseReady(true);
      })
      .catch(error => {
        console.error('Database MySQL tidak dapat dimuat.', error);
        setDatabaseError(error instanceof Error ? error.message : 'Database MySQL tidak dapat dimuat.');
        setIsDatabaseReady(false);
      })
      .finally(() => {
        if (cancelled) return;
        setIsDatabaseLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_accounts', accounts);
  }, [accounts, isDatabaseReady]);

  useEffect(() => {
    writeStorage('uppm_current_user_id', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_projects', projects);
  }, [projects, isDatabaseReady]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_publications', publications);
  }, [publications, isDatabaseReady]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_surat', surat);
  }, [surat, isDatabaseReady]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_surat_tugas', suratTugas);
  }, [suratTugas, isDatabaseReady]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_sinta_verifications', sintaVerifications);
  }, [sintaVerifications, isDatabaseReady]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_claim_submissions', claimSubmissions);
  }, [claimSubmissions, isDatabaseReady]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_monthly_updates', monthlyUpdates);
  }, [monthlyUpdates, isDatabaseReady]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_notifications', notifications);
  }, [notifications, isDatabaseReady]);

  useEffect(() => {
    if (!isDatabaseReady) return;

    queueDatabaseSync({
      accounts,
      projects,
      publications,
      surat,
      suratTugas,
      sintaVerifications,
      claimSubmissions,
      monthlyUpdates,
      notifications,
    });
  }, [accounts, projects, publications, surat, suratTugas, sintaVerifications, claimSubmissions, monthlyUpdates, notifications, isDatabaseReady]);

  const login = (username: string, password: string) => {
    const normalizedUsername = username.trim().toLowerCase();
    const account = accounts.find(item => item.username.toLowerCase() === normalizedUsername && item.password === password);

    if (!account) {
      return { ok: false, error: 'Username atau password tidak sesuai.' };
    }

    setCurrentUserId(account.id);
    return { ok: true };
  };

  const logout = () => {
    setCurrentUserId(null);
  };

  const createInitialAdmin = (payload: { username: string; password: string; nama: string }) => {
    const username = payload.username.trim();
    const password = payload.password.trim();
    const nama = payload.nama.trim() || 'Administrator UPPM';

    if (hasAdminAccount) return { ok: false, error: 'Akun admin sudah tersedia.' };
    if (username.length < 4) return { ok: false, error: 'Username admin minimal 4 karakter.' };
    if (password.length < 8) return { ok: false, error: 'Password admin minimal 8 karakter.' };

    const newAdmin: UserAccount = {
      id: `admin-${Date.now()}`,
      username,
      password,
      role: 'admin',
      nama,
    };

    setAccounts([newAdmin]);
    setCurrentUserId(newAdmin.id);
    return { ok: true };
  };

  const createDosenAccount = (payload: { dosenId: string; username: string; password: string }) => {
    const username = payload.username.trim();
    const lecturer = lecturerProfiles.find(dosen => dosen.id === payload.dosenId);

    if (!lecturer) return { ok: false, error: 'Dosen tidak ditemukan dalam daftar CSV.' };
    if (!username || !payload.password) return { ok: false, error: 'Username dan password wajib diisi.' };
    if (accounts.some(account => account.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, error: 'Username sudah dipakai.' };
    }

    const newAccount: UserAccount = {
      id: `user-${Date.now()}`,
      username,
      password: payload.password,
      role: 'dosen',
      dosenId: lecturer.id,
      nama: lecturer.nama,
      prodi: lecturer.prodi,
      nuptk: lecturer.nuptk,
    };

    setAccounts(prev => [newAccount, ...prev]);
    return { ok: true };
  };

  const deleteAccount = (id: string) => {
    if (id === 'admin') return;
    setAccounts(prev => prev.filter(account => account.id !== id));
    if (currentUserId === id) setCurrentUserId(null);
  };

  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject = withOwner({ ...project, id: Date.now().toString() });
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const addPublication = (pub: Omit<Publication, 'id'>) => {
    const newPub = withOwner({ ...pub, id: Date.now().toString() });
    setPublications(prev => [...prev, newPub]);
  };

  const deletePublication = (id: string) => {
    setPublications(prev => prev.filter(p => p.id !== id));
  };

  const addSurat = (s: Omit<SuratKeterangan, 'id' | 'tanggalRequest' | 'status'>) => {
    const newSurat: SuratKeterangan = {
      ...withOwner(s),
      id: Date.now().toString(),
      tanggalRequest: new Date().toISOString(),
      status: 'Menunggu'
    };
    setSurat(prev => [...prev, newSurat]);
  };

  const deleteSurat = (id: string) => {
    setSurat(prev => prev.filter(s => s.id !== id));
  };

  const addSuratTugas = (payload: Omit<SuratTugas, 'id' | 'tanggalPengajuan' | 'status'>) => {
    const newSuratTugas: SuratTugas = {
      ...withOwner(payload),
      id: Date.now().toString(),
      tanggalPengajuan: new Date().toISOString(),
      status: 'Menunggu'
    };
    setSuratTugas(prev => [newSuratTugas, ...prev]);
  };

  const deleteSuratTugas = (id: string) => {
    setSuratTugas(prev => prev.filter(item => item.id !== id));
  };

  const addSintaVerification = (payload: Omit<SintaVerification, 'id' | 'tanggalPengajuan' | 'status'>) => {
    const newVerification: SintaVerification = {
      ...withOwner(payload),
      id: Date.now().toString(),
      tanggalPengajuan: new Date().toISOString(),
      status: 'Menunggu Verifikasi'
    };
    setSintaVerifications(prev => [newVerification, ...prev]);
  };

  const deleteSintaVerification = (id: string) => {
    setSintaVerifications(prev => prev.filter(item => item.id !== id));
  };

  const addClaimSubmission = (payload: Omit<ClaimSubmission, 'id' | 'tanggalPengajuan' | 'status'>) => {
    const newClaim: ClaimSubmission = {
      ...withOwner(payload),
      id: Date.now().toString(),
      tanggalPengajuan: new Date().toISOString(),
      status: 'Menunggu'
    };
    setClaimSubmissions(prev => [newClaim, ...prev]);
  };

  const deleteClaimSubmission = (id: string) => {
    setClaimSubmissions(prev => prev.filter(item => item.id !== id));
  };

  const addMonthlyUpdate = (update: Omit<MonthlyResearchUpdate, 'id' | 'submittedAt'>) => {
    const newUpdate: MonthlyResearchUpdate = {
      ...withOwner(update),
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
    };
    setMonthlyUpdates(prev => [...prev, newUpdate]);
  };

  const updateMonthlyUpdate = (id: string, updates: Partial<MonthlyResearchUpdate>) => {
    setMonthlyUpdates(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteMonthlyUpdate = (id: string) => {
    setMonthlyUpdates(prev => prev.filter(item => item.id !== id));
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, isRead: true } : item));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
  };

  const updateSuratTugasStatus = (id: string, status: SuratTugas['status']) => {
    setSuratTugas(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (status !== 'Disetujui') return { ...item, status, finalDocument: undefined, qrPayload: '' };

      const finalDocument = item.finalDocument || createFinalDocument(
        'surat-tugas',
        item.namaKegiatan,
        item.nomorSurat,
        item as unknown as Record<string, unknown>,
        currentUser?.nama || 'Administrator UPPM',
      );

      return {
        ...item,
        status,
        finalDocument,
        qrPayload: finalDocument.barcodePayload,
      };
    }));
  };

  const updateSintaVerificationStatus = (id: string, status: SintaVerification['status']) => {
    setSintaVerifications(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (status !== 'Terverifikasi') return { ...item, status, finalDocument: undefined };

      const title = item.fields?.judul || `${item.jenisData} ${item.tahunPelaksanaan}`;
      const finalDocument = item.finalDocument || createFinalDocument(
        'sinta',
        title,
        `SINTA/${String(prev.length).padStart(3, '0')}/${new Date().getFullYear()}`,
        item as unknown as Record<string, unknown>,
        currentUser?.nama || 'Administrator UPPM',
      );

      return { ...item, status, finalDocument };
    }));
  };

  const updateClaimStatus = (id: string, status: ClaimSubmission['status']) => {
    setClaimSubmissions(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (status !== 'Disetujui') return { ...item, status, finalDocument: undefined };

      const finalDocument = item.finalDocument || createFinalDocument(
        'klaim',
        item.judul,
        `KLAIM/${String(prev.length).padStart(3, '0')}/${new Date().getFullYear()}`,
        item as unknown as Record<string, unknown>,
        currentUser?.nama || 'Administrator UPPM',
      );

      return { ...item, status, finalDocument };
    }));
  };

  const generateSuratTugasNumber = () => {
    const month = new Date().toLocaleDateString('id-ID', { month: '2-digit' }).replace(/\D/g, '') || '01';
    const year = new Date().getFullYear();
    const yearSuffix = `/${year}`;
    const highestSequence = suratTugas.reduce((highest, item) => {
      if (!item.nomorSurat?.endsWith(yearSuffix)) return highest;
      const sequence = Number.parseInt(item.nomorSurat.split('/')[0] || '0', 10);
      return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
    }, 0);
    const next = highestSequence + 1;

    return `${String(next).padStart(3, '0')}/UPPM/ST/${month}/${year}`;
  };

  return {
    accounts,
    isDatabaseLoading,
    databaseError,
    currentUser,
    isAdmin,
    hasAdminAccount,
    login,
    logout,
    createInitialAdmin,
    createDosenAccount,
    deleteAccount,
    lecturerProfiles,
    allProjects: projects,
    allPublications: publications,
    allSurat: surat,
    allSuratTugas: suratTugas,
    allSintaVerifications: sintaVerifications,
    allClaimSubmissions: claimSubmissions,
    projects: visibleProjects,
    addProject,
    updateProject,
    deleteProject,
    publications: visiblePublications,
    addPublication,
    deletePublication,
    surat: visibleSurat,
    addSurat,
    deleteSurat,
    suratTugas: visibleSuratTugas,
    addSuratTugas,
    deleteSuratTugas,
    updateSuratTugasStatus,
    generateSuratTugasNumber,
    sintaVerifications: visibleSintaVerifications,
    addSintaVerification,
    deleteSintaVerification,
    updateSintaVerificationStatus,
    claimSubmissions: visibleClaimSubmissions,
    addClaimSubmission,
    deleteClaimSubmission,
    updateClaimStatus,
    monthlyUpdates: visibleMonthlyUpdates,
    allMonthlyUpdates: monthlyUpdates,
    addMonthlyUpdate,
    updateMonthlyUpdate,
    deleteMonthlyUpdate,
    notifications,
    unreadNotifications: notifications.filter(n => !n.isRead),
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadCount: () => notifications.filter(n => !n.isRead).length,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStoreState();

  return createElement(
    StoreContext.Provider,
    { value: store },
    children,
  );
}

export function useStore() {
  const store = useContext(StoreContext);

  if (!store) {
    throw new Error('useStore harus digunakan di dalam StoreProvider.');
  }

  return store;
}
