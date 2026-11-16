import React, { useEffect, useState } from 'react';
import { BadgeCheck, CircleX, LoaderCircle } from 'lucide-react';

type VerificationResult = {
  valid: boolean;
  document?: {
    id: string;
    type: string;
    title: string;
    number: string;
    approvedAt: string;
    approvedBy: string;
    subjectName?: string;
    prodi?: string;
  };
};

const labels: Record<string, string> = {
  'surat-tugas': 'Surat Tugas',
  klaim: 'Klaim Dana',
  sinta: 'Verifikasi SINTA',
};

export default function DocumentVerification() {
  const documentId = new URLSearchParams(window.location.search).get('id') || '';
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/verify?id=${encodeURIComponent(documentId)}`)
      .then(async response => {
        const body = await response.json() as VerificationResult;
        if (!response.ok && response.status !== 404) throw new Error('Verifikasi gagal.');
        return body;
      })
      .then(body => { if (!cancelled) setResult(body); })
      .catch(() => { if (!cancelled) setResult({ valid: false }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [documentId]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-lg">
        <header className="bg-red-800 px-6 py-5 text-white">
          <p className="text-sm font-semibold">Politeknik Sinar Mas Berau Coal</p>
          <h1 className="text-xl font-bold">Verifikasi Dokumen UPPM</h1>
        </header>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-3 text-slate-600"><LoaderCircle className="h-6 w-6 animate-spin" />Memeriksa database...</div>
          ) : result?.valid && result.document ? (
            <div>
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
                <BadgeCheck className="h-8 w-8 shrink-0" />
                <div><p className="font-bold">Dokumen sah dan terdaftar</p><p className="text-sm">Data ditemukan pada database resmi UPPM.</p></div>
              </div>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-3 text-sm">
                <dt className="text-slate-500">Jenis</dt><dd className="font-semibold">{labels[result.document.type] || result.document.type}</dd>
                <dt className="text-slate-500">Nomor</dt><dd className="font-semibold break-words">{result.document.number}</dd>
                <dt className="text-slate-500">Judul</dt><dd>{result.document.title}</dd>
                {result.document.subjectName && <><dt className="text-slate-500">Pemohon/Ketua</dt><dd>{result.document.subjectName}</dd></>}
                {result.document.prodi && <><dt className="text-slate-500">Program Studi</dt><dd>{result.document.prodi}</dd></>}
                <dt className="text-slate-500">Disahkan</dt><dd>{new Date(result.document.approvedAt).toLocaleString('id-ID')}</dd>
                <dt className="text-slate-500">Validator</dt><dd>{result.document.approvedBy}</dd>
                <dt className="text-slate-500">ID Dokumen</dt><dd className="break-all font-mono text-xs">{result.document.id}</dd>
              </dl>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800">
              <CircleX className="h-8 w-8 shrink-0" />
              <div><p className="font-bold">Dokumen tidak valid</p><p className="text-sm">ID tidak ditemukan atau dokumen belum disahkan.</p></div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
