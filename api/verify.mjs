import { createMysqlStore } from '../server/mysql.mjs';
import { findVerifiedDocument } from '../server/document-verification.mjs';

let storePromise;

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ valid: false, error: 'Method not allowed.' });
  }

  const documentId = String(request.query?.id || '');
  try {
    storePromise ||= createMysqlStore({ importLegacy: false });
    const store = await storePromise;
    const { payload } = await store.loadSnapshot();
    const document = findVerifiedDocument(payload, documentId);
    if (!document) return response.status(404).json({ valid: false });
    response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    return response.status(200).json({ valid: true, document });
  } catch (error) {
    console.error('Document verification failed:', error);
    return response.status(503).json({ valid: false, error: 'Database verifikasi tidak tersedia.' });
  }
}
