// Vercel Serverless Function - SINTA API Proxy
// Endpoint: /api/sinta/:authorId

const SINTA_API_BASE = 'https://sinta.kemdiktisaintek.go.id/api/authors';
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use GET.',
    });
  }

  const { authorId } = req.query;

  // Validate authorId
  if (!authorId || !/^\d+$/.test(authorId)) {
    return res.status(400).json({
      ok: false,
      error: 'Author ID tidak valid. Harus berupa angka.',
    });
  }

  // Check cache (5 minutes TTL)
  const cached = cache.get(authorId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({
      ok: true,
      data: cached.data,
      cached: true,
    });
  }

  try {
    // Fetch from SINTA API
    const response = await fetch(`${SINTA_API_BASE}/${authorId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'UPPM-Poltek-Berau/1.0',
      },
    });

    // Check if SINTA API responded successfully
    if (!response.ok) {
      console.error(`SINTA API error: HTTP ${response.status}`);
      return res.status(response.status).json({
        ok: false,
        error: `SINTA API returned HTTP ${response.status}. Author mungkin tidak ditemukan.`,
      });
    }

    const data = await response.json();

    // Validate that we got useful data
    if (!data || typeof data !== 'object') {
      return res.status(500).json({
        ok: false,
        error: 'Invalid response from SINTA API.',
      });
    }

    // Cache the result
    cache.set(authorId, {
      data,
      timestamp: Date.now(),
    });

    // Return success response
    return res.status(200).json({
      ok: true,
      data,
      cached: false,
    });
  } catch (error) {
    console.error('SINTA API fetch error:', error);

    // Handle specific error types
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(503).json({
        ok: false,
        error: 'Tidak dapat terhubung ke SINTA API. Periksa koneksi internet.',
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'Gagal mengambil data dari SINTA. Silakan coba lagi nanti.',
    });
  }
}
