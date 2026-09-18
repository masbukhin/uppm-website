const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return response.status(500).json({ ok: false, error: 'Turnstile secret belum dikonfigurasi di server.' });
  }

  const token = typeof request.body?.token === 'string' ? request.body.token : '';
  if (!token) {
    return response.status(400).json({ ok: false, error: 'Token verifikasi tidak ditemukan.' });
  }

  const clientIp = request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for']?.split(',')[0]?.trim();
  const body = new URLSearchParams({ secret, response: token });
  if (clientIp) body.set('remoteip', clientIp);

  try {
    const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = await verifyResponse.json();

    if (!result.success) {
      return response.status(403).json({ ok: false, error: 'Verifikasi Cloudflare gagal.', codes: result['error-codes'] || [] });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return response.status(502).json({ ok: false, error: 'Gagal menghubungi Cloudflare Turnstile.' });
  }
}
