// The snapshot API now requires a server-side login session (see server/index.mjs).
// The old unauthenticated Vercel function is disabled; the app runs on the VPS (Docker).
export default function handler(_request, response) {
  response.status(410).json({
    ok: false,
    error: 'Endpoint ini dinonaktifkan. Aplikasi berjalan di server VPS dengan login server-side.',
  });
}
