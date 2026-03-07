import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProjectForm from './components/ProjectForm';
import PublicationForm from './components/PublicationForm';
import SuratKeteranganForm from './components/SuratKeteranganForm';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

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
      </AnimatePresence>
    </Layout>
  );
}
