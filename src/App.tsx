import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProjectForm from './components/ProjectForm';
import PublicationForm from './components/PublicationForm';
import SuratKeteranganForm from './components/SuratKeteranganForm';
import SuratTugasForm from './components/SuratTugasForm';
import SintaVerificationForm from './components/SintaVerificationForm';
import ClaimSubmissionForm from './components/ClaimSubmissionForm';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import MonthlyUpdateForm from './components/MonthlyUpdateForm';
import MonthlyReportDashboard from './components/MonthlyReportDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from './store/useStore';

export default function App() {
  const { currentUser, isAdmin } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!isAdmin && activeTab === 'admin') {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin]);

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Dashboard />
          </motion.div>
        )}
        {activeTab === 'projects' && (
          <motion.div
            key="projects"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <ProjectForm />
          </motion.div>
        )}
        {activeTab === 'publications' && (
          <motion.div
            key="publications"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <PublicationForm />
          </motion.div>
        )}
        {activeTab === 'surat' && (
          <motion.div
            key="surat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <SuratKeteranganForm />
          </motion.div>
        )}
        {activeTab === 'admin' && isAdmin && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <AdminPanel />
          </motion.div>
        )}
        {activeTab === 'surat-tugas' && (
          <motion.div
            key="surat-tugas"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <SuratTugasForm />
          </motion.div>
        )}
        {activeTab === 'sinta-verifikator' && (
          <motion.div
            key="sinta-verifikator"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <SintaVerificationForm />
          </motion.div>
        )}
        {activeTab === 'klaim' && (
          <motion.div
            key="klaim"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <ClaimSubmissionForm />
          </motion.div>
        )}
        {activeTab === 'monthly-update' && (
          <motion.div
            key="monthly-update"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <MonthlyUpdateForm />
          </motion.div>
        )}
        {activeTab === 'monthly-report' && isAdmin && (
          <motion.div
            key="monthly-report"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <MonthlyReportDashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
