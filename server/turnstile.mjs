const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/** Returns { ok: true } or { ok: false, status, error }. */
export async function verifyTurnstileToken(token, clientIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, status: 500, error: 'Turnstile secret belum dikonfigurasi di server.' };
  if (typeof token !== 'string' || !token) return { ok: false, status: 400, error: 'Token verifikasi tidak ditemukan.' };

  const body = new URLSearchParams({ secret, response: token });
  if (clientIp) body.set('remoteip', clientIp);
  try {
    const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = await verifyResponse.json();
    if (!result.success) return { ok: false, status: 403, error: 'Verifikasi Cloudflare gagal.', codes: result['error-codes'] || [] };
    return { ok: true };
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return { ok: false, status: 502, error: 'Gagal menghubungi Cloudflare Turnstile.' };
  }
}
