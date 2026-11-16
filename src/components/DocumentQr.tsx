import { QRCodeSVG } from 'qrcode.react';
import { getDocumentVerificationUrl } from '../services/documentVerification';

export default function DocumentQr({ documentId, size = 96 }: { documentId?: string; size?: number }) {
  if (!documentId) {
    return (
      <div className="flex items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-center text-[10px] text-slate-500" style={{ width: size, height: size }}>
        QR terbit setelah disetujui
      </div>
    );
  }

  const verificationUrl = getDocumentVerificationUrl(documentId);
  return (
    <a href={verificationUrl} target="_blank" rel="noreferrer" aria-label="Buka verifikasi dokumen">
      <QRCodeSVG value={verificationUrl} size={size} level="M" marginSize={2} title="QR verifikasi dokumen UPPM" />
    </a>
  );
}
