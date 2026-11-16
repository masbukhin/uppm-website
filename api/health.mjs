import { createMysqlStore } from '../server/mysql.mjs';

let storePromise;

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const configured = (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE)
    || (process.env.TIDB_HOST && process.env.TIDB_USER && process.env.TIDB_DATABASE);
  if (!configured) {
    return response.status(503).json({ ok: false, error: 'Environment MySQL belum lengkap.' });
  }

  try {
    storePromise ||= createMysqlStore({ importLegacy: false });
    const store = await storePromise;
    return response.status(200).json({ ok: true, database: await store.health() });
  } catch (error) {
    console.error('MySQL health check failed:', error);
    return response.status(503).json({ ok: false, error: 'MySQL tidak dapat dihubungi.' });
  }
}
