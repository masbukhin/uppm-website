const SINTA_API_BASE = 'https://sinta.kemdiktisaintek.go.id/api/authors';
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { authorId, sourceUrl } = req.query;

  if (!authorId || !/^\d+$/.test(authorId)) {
    return res.status(400).json({
      ok: false,
      error: 'Author ID tidak valid. Harus berupa angka.',
    });
  }

  const cached = cache.get(authorId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ ok: true, data: cached.data, cached: true });
  }

  const affiliationUrl = typeof sourceUrl === 'string' && sourceUrl.includes('/affiliations/authors/')
    ? sourceUrl
    : `https://sinta.kemdiktisaintek.go.id/affiliations/authors/${authorId}?page=1`;
  const authorProfileUrl = `https://sinta.kemdiktisaintek.go.id/authors/profile/${authorId}?view=garuda`;

  try {
    // 1) Try affiliation page HTML first
    const affiliationResponse = await fetch(affiliationUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'UPPM-Poltek-Berau/1.0',
      },
    });

    if (affiliationResponse.ok) {
      const html = await affiliationResponse.text();
      if (html.includes('profile-name') && html.includes('authors/profile/')) {
        return res.status(200).json({
          ok: true,
          kind: 'affiliation',
          data: { html, sourceUrl: affiliationUrl },
          cached: false,
        });
      }
    }

    // 2) Fallback to author profile HTML
    const profileResponse = await fetch(authorProfileUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'UPPM-Poltek-Berau/1.0',
      },
    });

    if (profileResponse.ok) {
      const html = await profileResponse.text();
      cache.set(authorId, { data: { html, sourceUrl: authorProfileUrl }, timestamp: Date.now() });
      return res.status(200).json({
        ok: true,
        kind: 'profile',
        data: { html, sourceUrl: authorProfileUrl },
        cached: false,
      });
    }

    // 3) Last resort: JSON API fallback (may 404 on some records)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`https://sinta.kemdiktisaintek.go.id/api/authors/${authorId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'UPPM-Poltek-Berau/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `SINTA API returned HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    cache.set(authorId, { data, timestamp: Date.now() });
    return res.status(200).json({ ok: true, kind: 'json', data, cached: false });
  } catch (error) {
    console.error('SINTA API error:', error);

    if (error.name === 'AbortError') {
      return res.status(504).json({
        ok: false,
        error: 'SINTA API timeout. Server SINTA tidak merespons dalam 30 detik.',
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'Gagal mengambil data dari SINTA',
    });
  }
}
