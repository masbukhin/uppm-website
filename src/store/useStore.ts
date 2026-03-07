import { useState, useEffect } from 'react';
import { Project, Publication, SuratKeterangan } from '../types';

export function useStore() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('uppm_projects');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: '1',
        judul: 'Optimasi Rantai Pasok Batubara',
        abstrak: 'Penelitian ini bertujuan untuk mengoptimalkan rantai pasok batubara...',
        kategori: 'Penelitian',
        skema: 'Internal',
        status: 'Laporan Akhir',
        prodi: 'TRL',
        ketua: 'Dr. Budi Santoso',
        anggota: 'Andi M, S.T., M.T.',
        tahunAnggaran: '2023',
        dana: 15000000,
        fileName: 'Laporan_Akhir_Optimasi.pdf'
      },
      {
        id: '2',
        judul: 'Pelatihan Maintenance Alat Berat',
        abstrak: 'Pengabdian masyarakat berupa pelatihan maintenance alat berat bagi siswa SMK...',
        kategori: 'Pengabdian',
        skema: 'Hibah Kompetitif',
        status: 'Proposal',
        prodi: 'TPM',
        ketua: 'Ir. Joko Widodo',
        anggota: 'Siti Aminah, S.T.',
        tahunAnggaran: '2024',
        dana: 20000000
      }
    ];
  });

  const [publications, setPublications] = useState<Publication[]>(() => {
    const saved = localStorage.getItem('uppm_publications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [surat, setSurat] = useState<SuratKeterangan[]>(() => {
    const saved = localStorage.getItem('uppm_surat');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('uppm_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('uppm_publications', JSON.stringify(publications));
  }, [publications]);

  useEffect(() => {
    localStorage.setItem('uppm_surat', JSON.stringify(surat));
  }, [surat]);

  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: Date.now().toString() };
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const addPublication = (pub: Omit<Publication, 'id'>) => {
    const newPub = { ...pub, id: Date.now().toString() };
    setPublications(prev => [...prev, newPub]);
  };

  const deletePublication = (id: string) => {
    setPublications(prev => prev.filter(p => p.id !== id));
  };

  const addSurat = (s: Omit<SuratKeterangan, 'id' | 'tanggalRequest' | 'status'>) => {
    const newSurat: SuratKeterangan = {
      ...s,
      id: Date.now().toString(),
      tanggalRequest: new Date().toISOString(),
      status: 'Menunggu'
    };
    setSurat(prev => [...prev, newSurat]);
  };

  const deleteSurat = (id: string) => {
    setSurat(prev => prev.filter(s => s.id !== id));
  };

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    publications,
    addPublication,
    deletePublication,
    surat,
    addSurat,
    deleteSurat
  };
}
