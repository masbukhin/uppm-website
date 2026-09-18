import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Loader2, RefreshCw, X } from 'lucide-react';
import { fetchSintaData, fetchSintaAuthorsFromAffiliation, formatSintaPublicationsForForm, validateSintaUrl, type SintaAuthor } from '../services/sintaService';
import { PublikasiEntry, SintaPublication } from '../types';

interface SintaImportDialogProps {
  profileUrl: string;
  onImport: (publications: PublikasiEntry[]) => void;
  onClose: () => void;
}

export default function SintaImportDialog({ profileUrl, onImport, onClose }: SintaImportDialogProps) {
  const [url, setUrl] = useState(profileUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authors, setAuthors] = useState<SintaAuthor[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<SintaAuthor | null>(null);
  const [publications, setPublications] = useState<SintaPublication[]>([]);
  const [selectedPubs, setSelectedPubs] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'input' | 'authors' | 'preview' | 'success'>('input');
  const [isAuthorLoading, setIsAuthorLoading] = useState(false);

  const handleFetch = async () => {
    if (!validateSintaUrl(url)) {
      setError('URL SINTA tidak valid. Pastikan format benar (contoh: https://sinta.kemdiktisaintek.go.id/affiliations/authors/8224)');
      return;
    }

    setIsLoading(true);
    setIsAuthorLoading(true);
    setError(null);

    try {
      const data = await fetchSintaData(url);

      if (data.kind === 'affiliation') {
        setAuthors(data.authors);
        setStep('authors');
        return;
      }

      setPublications(data.publications);
      setStep('preview');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal mengambil data dari SINTA';
      setError(`${errorMessage}. Pastikan server backend berjalan dan URL profil SINTA benar.`);
    } finally {
      setIsLoading(false);
      setIsAuthorLoading(false);
    }
  };

  const handleToggleSelect = (sintaId: string) => {
    const newSelected = new Set(selectedPubs);
    if (newSelected.has(sintaId)) {
      newSelected.delete(sintaId);
    } else {
      newSelected.add(sintaId);
    }
    setSelectedPubs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPubs.size === publications.length) {
      setSelectedPubs(new Set());
    } else {
      setSelectedPubs(new Set(publications.map(p => p.sintaId)));
    }
  };

  const handleSelectAuthor = async (author: SintaAuthor) => {
    setSelectedAuthor(author);
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchSintaData(author.profileUrl);
      if (data.kind === 'publications') {
        setPublications(data.publications);
        setStep('preview');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal mengambil data publikasi author';
      setError(`${errorMessage}. Silakan pilih author lain atau gunakan input manual.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    const selectedPublications = publications.filter(p => selectedPubs.has(p.sintaId));
    const formatted = formatSintaPublicationsForForm(selectedPublications);
    onImport(formatted);
    setStep('success');
  };

  const handleBackToAuthors = () => {
    setStep('authors');
    setError(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Import dari SINTA</h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Step: Input URL */}
            {step === 'input' && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Masukkan URL profil SINTA Anda untuk mengimpor data publikasi.
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">URL Profil SINTA</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://sinta.kemdiktisaintek.go.id/affiliations/authors/XXXX"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 text-lg">⚠️</span>
                      <div>
                        <p className="text-red-800 font-medium">Gagal mengambil data</p>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleFetch}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      Coba Lagi
                    </button>
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="font-medium text-slate-700 mb-2">Contoh URL:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                    <li>https://sinta.kemdiktisaintek.go.id/affiliations/authors/8224</li>
                    <li>https://sinta.kemdiktisaintek.go.id/authors/8224</li>
                  </ul>

                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <h4 className="font-medium text-slate-700 mb-2">Tips Memperbaiki Error:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                      <li>Pastikan server backend berjalan: <code className="bg-slate-100 px-1 rounded">npm run server</code></li>
                      <li>Periksa koneksi internet Anda</li>
                      <li>Valid ID hanya berupa angka (contoh: 8224)</li>
                      <li>Jika SINTA down, coba beberapa saat lagi</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Author Selection */}
            {step === 'authors' && (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-600">
                    Ditemukan {authors.length} dosen pada affiliation ini. Pilih dosen untuk melihat publikasinya.
                  </p>
                  {selectedAuthor && (
                    <p className="text-sm text-slate-500 mt-1">
                      Affiliation: {selectedAuthor.department || 'Tidak tersedia'}
                    </p>
                  )}
                </div>

                {authors.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Tidak ada author yang terdeteksi pada halaman affiliation ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {authors.map((author) => (
                      <button
                        key={author.authorId}
                        onClick={() => handleSelectAuthor(author)}
                        className="w-full text-left flex items-start gap-3 p-4 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 line-clamp-2">{author.name}</p>
                          <p className="text-sm text-slate-500 mt-1">ID Author: {author.authorId}</p>
                          {author.department && (
                            <p className="text-xs text-slate-400 mt-1">{author.department}</p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">Pilih</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Preview Publications */}
            {step === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">
                    Ditemukan {publications.length} publikasi. Pilih yang ingin di-import:
                  </p>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    {selectedPubs.size === publications.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>

                {publications.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Tidak ditemukan publikasi di profil SINTA ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {publications.map((pub) => (
                      <label
                        key={pub.sintaId}
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedPubs.has(pub.sintaId)
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPubs.has(pub.sintaId)}
                          onChange={() => handleToggleSelect(pub.sintaId)}
                          className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 line-clamp-2">{pub.judul}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            {pub.namaJurnal} • {pub.tahun}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            {pub.jenis}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-slate-900 mb-2">Import Berhasil!</h4>
                <p className="text-slate-600">
                  {selectedPubs.size} publikasi berhasil di-import.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              {step === 'success' ? 'Tutup' : 'Batal'}
            </button>

            {step === 'input' && (
              <button
                onClick={handleFetch}
                disabled={!url || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengambil Data...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Cari Dosen
                  </>
                )}
              </button>
            )}

            {step === 'authors' && (
              <button
                onClick={handleBackToAuthors}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Kembali
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={selectedPubs.size === 0}
                className="px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Import {selectedPubs.size} Publikasi
              </button>
            )}

            {step === 'authors' && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 flex items-center gap-2"
              >
                Tutup
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
