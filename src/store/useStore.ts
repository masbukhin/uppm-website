import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { lecturerProfiles as defaultLecturerProfiles } from '../data/lecturers';
import { normalizeProdi } from '../data/prodi';
import { loadDatabaseSnapshot, queueDatabaseSync } from '../services/databaseSync';
import { getDocumentVerificationUrl } from '../services/documentVerification';
import { createSuratTugasNumber, getSuratTugasPeriod, getSuratTugasSignatory, normalizeSuratTugas } from '../services/suratTugasPolicy';
import { ClaimSubmission, DosenProfile, FinalDocument, MonthlyResearchUpdate, Notification, OwnedRecord, Project, Publication, Prodi, SintaVerification, SuratKeterangan, SuratTugas, UserAccount, UserRole } from '../types';

type StoreValue = ReturnType<typeof useStoreState>;
type DatabaseSnapshot = {
  lecturerProfiles?: DosenProfile[];
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
  const barcodePayload = getDocumentVerificationUrl(documentId);

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
  const [lecturerProfiles, setLecturerProfiles] = useState<DosenProfile[]>(defaultLecturerProfiles);
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
  const applyingRemoteSnapshot = useRef(false);

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

    const applySnapshot = (snapshot: DatabaseSnapshot) => {
      applyingRemoteSnapshot.current = true;
      const profiles = normalizeOwnedProdi(snapshot.lecturerProfiles?.length ? snapshot.lecturerProfiles : defaultLecturerProfiles);
      setLecturerProfiles(profiles);
      setAccounts(sanitizeAccounts(snapshot.accounts || []).map(account => {
        const profile = profiles.find(item => item.id === account.dosenId);
        return profile ? { ...account, nama: profile.nama, nuptk: profile.nuptk, prodi: profile.prodi || account.prodi } : account;
      }));
      setProjects(normalizeOwnedProdi(snapshot.projects || []));
      setPublications(snapshot.publications || []);
      setSurat(normalizeOwnedProdi(snapshot.surat || []));
      setSuratTugas(normalizeOwnedProdi(snapshot.suratTugas || []).map(normalizeSuratTugas));
      setSintaVerifications(normalizeOwnedProdi(snapshot.sintaVerifications || []));
      setClaimSubmissions(normalizeOwnedProdi(snapshot.claimSubmissions || []));
      setMonthlyUpdates(normalizeOwnedProdi(snapshot.monthlyUpdates || []));
      setNotifications(snapshot.notifications || []);
    };

    const refreshDatabase = async (initial = false) => {
      try {
        const state = await loadDatabaseSnapshot<DatabaseSnapshot>();
        if (cancelled) return;
        if (initial || state.changed) applySnapshot(state.payload || {});
        setDatabaseError('');
        setIsDatabaseReady(true);
      } catch (error) {
        console.error('Database MySQL tidak dapat dimuat.', error);
        if (initial) {
          setDatabaseError(error instanceof Error ? error.message : 'Database MySQL tidak dapat dimuat.');
          setIsDatabaseReady(false);
        }
      } finally {
        if (initial && !cancelled) setIsDatabaseLoading(false);
      }
    };

    void refreshDatabase(true);
    const pollTimer = window.setInterval(() => void refreshDatabase(false), 4000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, []);

  useEffect(() => {
    if (!isDatabaseReady) return;
    writeStorage('uppm_lecturer_profiles', lecturerProfiles);
  }, [lecturerProfiles, isDatabaseReady]);

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
    if (applyingRemoteSnapshot.current) {
      applyingRemoteSnapshot.current = false;
      return;
    }

    queueDatabaseSync({
      lecturerProfiles,
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
  }, [lecturerProfiles, accounts, projects, publications, surat, suratTugas, sintaVerifications, claimSubmissions, monthlyUpdates, notifications, isDatabaseReady]);

  const login = (username: string, password: string, role: UserRole) => {
    const normalizedUsername = username.trim().toLowerCase();
    const credentialsAccount = accounts.find(item => item.username.toLowerCase() === normalizedUsername && item.password === password);

    if (!credentialsAccount) {
      return { ok: false, error: 'Username atau password tidak sesuai.' };
    }

    if (credentialsAccount.role !== role) {
      const actualRole = credentialsAccount.role === 'admin' ? 'Admin' : 'Dosen';
      return { ok: false, error: `Akun ini terdaftar sebagai ${actualRole}. Pilih login ${actualRole}.` };
    }

    setCurrentUserId(credentialsAccount.id);
    return { ok: true };
  };

  const logout = () => {
    setCurrentUserId(null);
  };

  const updateLecturerNuptk = (id: string, nuptkValue: string) => {
    if (!isAdmin) return { ok: false, error: 'Hanya admin yang dapat mengubah data dosen.' };
    const nuptk = nuptkValue.trim();
    if (!/^\d{16}$/.test(nuptk)) return { ok: false, error: 'NUPTK harus terdiri dari 16 angka.' };
    if (lecturerProfiles.some(item => item.id !== id && item.nuptk === nuptk)) return { ok: false, error: 'NUPTK sudah terdaftar.' };
    if (!lecturerProfiles.some(item => item.id === id)) return { ok: false, error: 'Dosen tidak ditemukan.' };

    setLecturerProfiles(prev => prev.map(item => item.id === id ? { ...item, nuptk } : item));
    setAccounts(prev => prev.map(account => account.dosenId === id ? { ...account, nuptk } : account));
    return { ok: true };
  };

  const createLecturerProfile = (payload: { nama: string; nuptk: string; prodi?: Prodi }) => {
    if (!isAdmin) return { ok: false, error: 'Hanya admin yang dapat menambah dosen.' };
    const nama = payload.nama.trim();
    const nuptk = payload.nuptk.trim();
    if (nama.length < 2) return { ok: false, error: 'Nama dosen wajib diisi.' };
    if (!/^\d{16}$/.test(nuptk)) return { ok: false, error: 'NUPTK harus terdiri dari 16 angka.' };
    if (lecturerProfiles.some(item => item.nuptk === nuptk)) return { ok: false, error: 'NUPTK sudah terdaftar.' };

    const newProfile: DosenProfile = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nama,
      nuptk,
      jabatanFungsional: '-',
      ...(payload.prodi ? { prodi: payload.prodi } : {}),
    };
    setLecturerProfiles(prev => [...prev, newProfile]);
    return { ok: true };
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
    if (!isAdmin) return { ok: false, error: 'Hanya admin yang dapat membuat akun dosen.' };
    const username = payload.username.trim();
    const lecturer = lecturerProfiles.find(dosen => dosen.id === payload.dosenId);

    if (!lecturer) return { ok: false, error: 'Dosen tidak ditemukan dalam daftar dosen.' };
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
    if (!isAdmin) return;
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
    const signatory = getSuratTugasSignatory(payload.tanggalMulai);
    const newSuratTugas: SuratTugas = {
      ...withOwner(payload),
      nomorSurat: generateSuratTugasNumber(payload.tanggalMulai),
      penandatangan: signatory.name,
      jabatanPenandatangan: signatory.role,
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
    const tahap = payload.tahap || 'Reimburse';
    if (tahap === 'Reimburse') {
      const plan = claimSubmissions.find(item => item.id === payload.rencanaId);
      const planOwnedByUser = plan && (!currentUser || plan.ownerId === currentUser.id);
      const alreadyUsed = claimSubmissions.some(item =>
        item.rencanaId === payload.rencanaId
        && (item.tahap || 'Reimburse') === 'Reimburse'
        && item.status !== 'Ditolak',
      );
      if (!plan || plan.tahap !== 'Rencana Submit' || plan.status !== 'Disetujui' || !planOwnedByUser || alreadyUsed) {
        return { ok: false, error: 'Pilih rencana submit yang sudah disetujui admin dan belum digunakan.' };
      }
    }
    const newClaim: ClaimSubmission = {
      ...withOwner(payload),
      tahap,
      rencanaId: tahap === 'Reimburse' ? payload.rencanaId : undefined,
      id: Date.now().toString(),
      tanggalPengajuan: new Date().toISOString(),
      status: 'Menunggu'
    };
    setClaimSubmissions(prev => [newClaim, ...prev]);
    return { ok: true };
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
    if (!isAdmin) return;
    setSuratTugas(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (status !== 'Disetujui') return { ...item, status, finalDocument: undefined, qrPayload: '' };

      const signatory = getSuratTugasSignatory(item.tanggalMulai);
      const { year, month } = getSuratTugasPeriod(item.tanggalMulai);
      const approvedItem = item.finalDocument ? normalizeSuratTugas(item) : {
        ...item,
        nomorSurat: item.nomorSurat.endsWith(`/UPPM/ST/${month}/${year}`)
          ? item.nomorSurat
          : createSuratTugasNumber(prev, item.tanggalMulai),
        penandatangan: signatory.name,
        jabatanPenandatangan: signatory.role,
      };
      const finalDocument = approvedItem.finalDocument || createFinalDocument(
        'surat-tugas',
        approvedItem.namaKegiatan,
        approvedItem.nomorSurat,
        approvedItem as unknown as Record<string, unknown>,
        currentUser?.nama || 'Administrator UPPM',
      );

      return {
        ...approvedItem,
        status,
        finalDocument,
        qrPayload: finalDocument.barcodePayload,
      };
    }));
  };

  const updateSintaVerificationStatus = (id: string, status: SintaVerification['status']) => {
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    setClaimSubmissions(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (status !== 'Disetujui') return { ...item, status, finalDocument: undefined };
      if (item.tahap === 'Rencana Submit') return { ...item, status, finalDocument: undefined };
      if (item.rencanaId) {
        const plan = prev.find(candidate => candidate.id === item.rencanaId);
        if (!plan || plan.tahap !== 'Rencana Submit' || plan.status !== 'Disetujui') return item;
      }

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

  const generateSuratTugasNumber = (tanggalMulai = '') => createSuratTugasNumber(suratTugas, tanggalMulai);

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
    updateLecturerNuptk,
    createLecturerProfile,
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
