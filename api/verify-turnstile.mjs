import { verifyTurnstileToken } from '../server/turnstile.mjs';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const clientIp = request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for']?.split(',')[0]?.trim();
  const result = await verifyTurnstileToken(request.body?.token, clientIp);
  if (!result.ok) return response.status(result.status).json({ ok: false, error: result.error, codes: result.codes });
  return response.status(200).json({ ok: true });
}
