const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://uppm-website.vercel.app').replace(/\/$/, '');

export function getDocumentVerificationUrl(documentId: string) {
  return `${PUBLIC_APP_URL}/verify?id=${encodeURIComponent(documentId)}`;
}
