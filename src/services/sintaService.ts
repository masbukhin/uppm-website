import type { SintaPublication } from '../types';

export interface SintaAuthor {
  name: string;
  authorId: string;
  profileUrl: string;
  department?: string;
}

export type SintaFetchResult =
  | { kind: 'publications'; publications: SintaPublication[] }
  | { kind: 'affiliation'; authors: SintaAuthor[]; affiliationId?: string; affiliationName?: string; sourceUrl: string }

const SINTA_PROXY_BASE = '/api/sinta';
const cache = new Map<string, { data: SintaPublication[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extract SINTA author ID from a profile URL
 */
export function extractSintaId(url: string): string | null {
  // Handle various URL formats:
  // https://sinta.kemdiktisaintek.go.id/affiliations/authors/8224?page=1
  // https://sinta.kemdiktisaintek.go.id/authors/8224
  // Just the ID: 8224
  const patterns = [
    /\/authors\/(\d+)/i,
    /\/(\d+)(?:\?|$)/,
    /^(\d+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate SINTA profile URL format
 */
export function validateSintaUrl(url: string): boolean {
  const id = extractSintaId(url);
  return id !== null && /^\d+$/.test(id);
}

/**
 * Fetch publication data from SINTA via server proxy
 */
export async function fetchSintaData(profileUrl: string, authorName?: string): Promise<SintaFetchResult> {
  const authorId = extractSintaId(profileUrl);
  if (!authorId) {
    throw new Error('URL SINTA tidak valid. Gunakan format: https://sinta.kemdiktisaintek.go.id/affiliations/authors/{authorId}');
  }

  const cacheKey = `${authorId}:${profileUrl.includes('/affiliations/authors/') ? 'affiliation' : 'profile'}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { kind: 'publications', publications: cached.data };
  }

  try {
    const query = new URLSearchParams({
      authorId,
      sourceUrl: profileUrl,
    });

    const response = await fetch(`${SINTA_PROXY_BASE}?${query.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Gagal mengambil data dari SINTA (HTTP ${response.status})`);
    }

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'Gagal mengambil data dari SINTA');
    }

    if (result.kind === 'affiliation') {
      const html = result.data?.html || '';
      const authors = extractAffiliationAuthorsFromHtml(html, profileUrl);
      return {
        kind: 'affiliation',
        authors,
        affiliationId: result.data?.affiliationId || authorId,
        affiliationName: result.data?.affiliationName,
        sourceUrl: profileUrl,
      };
    }

    if (result.kind === 'profile') {
      const html = result.data?.html || '';
      const parsedName = extractAuthorNameFromProfileHtml(html) || authorName || authorId;
      const publications = parseGarudaPublicationsFromHtml(html, parsedName);
      if (publications.length > 0) {
        cache.set(cacheKey, { data: publications, timestamp: Date.now() });
        return { kind: 'publications', publications };
      }

      const fallback = await fetchGarudaPublicationsFromSearch(parsedName);
      if (fallback.length > 0) {
        cache.set(cacheKey, { data: fallback, timestamp: Date.now() });
        return { kind: 'publications', publications: fallback };
      }

      return { kind: 'publications', publications: [] };
    }

    const publications = extractPublicationsFromSintaResponse(result.data);
    cache.set(cacheKey, { data: publications, timestamp: Date.now() });
    return { kind: 'publications', publications };
  } catch (error) {
    console.error('Error fetching SINTA data:', error);
    throw error;
  }
}

/**
 * Extract and normalize publications from SINTA API response
 */
function extractPublicationsFromSintaResponse(response: any): SintaPublication[] {
  const publications: SintaPublication[] = [];

  // SINTA API response structure varies, handle multiple formats
  const pubData = response?.publications || response?.data?.publications || [];

  for (const pub of pubData) {
    try {
      const publication: SintaPublication = {
        judul: pub.title || pub.judul || '',
        tahun: String(pub.year || pub.tahun || new Date().getFullYear()),
        namaJurnal: pub.journal || pub.publisher || pub.namaJurnal || '',
        jenis: determinePublikasiJenis(pub),
        sintaId: String(pub.id || pub.sinta_id || ''),
        url: pub.url || pub.doi || undefined,
      };

      if (publication.judul) {
        publications.push(publication);
      }
    } catch (err) {
      console.warn('Error parsing SINTA publication entry:', err);
    }
  }

  return publications;
}

function extractAffiliationAuthorsFromHtml(html: string, sourceUrl: string): SintaAuthor[] {
  const authors: SintaAuthor[] = [];
  const seen = new Set<string>();

  const blocks = [...html.matchAll(/<div class="ar-list-item mb-5">([\s\S]*?)<\/div>\s*<\/div>/gi)];
  for (const block of blocks) {
    const chunk = block[1];
    const profileMatch = chunk.match(/<div class="profile-name"><a href="https:\/\/sinta\.kemdiktisaintek\.go\.id\/authors\/profile\/(\d+)">([^<]+)<\/a>/i)
      || chunk.match(/<div class="profile-name"><a href="https:\/\/sinta\.kemdiktisaintek\.go\.id\/authors\/profile\/(\d+)\/\?view=[^"]+">([^<]+)<\/a>/i);
    if (!profileMatch) continue;

    const authorId = profileMatch[1];
    const name = profileMatch[2].trim();
    const deptMatch = chunk.match(/<div class="profile-dept">([\s\S]*?)<\/div>/i);
    const department = deptMatch ? deptMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : undefined;
    const key = `${authorId}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    authors.push({
      name,
      authorId,
      profileUrl: `https://sinta.kemdiktisaintek.go.id/authors/profile/${authorId}`,
      department,
    });
  }

  if (authors.length === 0) {
    const linkRegex = /<a href="https:\/\/sinta\.kemdiktisaintek\.go.id\/authors\/profile\/(\d+)">([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) !== null) {
      const authorId = match[1];
      const name = match[2].trim();
      const key = `${authorId}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      authors.push({
        name,
        authorId,
        profileUrl: `https://sinta.kemdiktisaintek.go.id/authors/profile/${authorId}`,
      });
    }
  }

  return authors;
}

function extractAffiliationMeta(html: string): { affiliationId?: string; affiliationName?: string } {
  const nameMatch = html.match(/<div class="univ-name">[\s\S]*?<h3><a href="#!">([^<]+)<\/a><\/h3>/i);
  const idMatch = html.match(/ID :\s*(\d+)/i);

  return {
    affiliationId: idMatch?.[1],
    affiliationName: nameMatch?.[1]?.trim(),
  };
}

function extractAuthorNameFromProfileHtml(html: string): string | null {
  const nameMatch = html.match(/<div class="profile-name"><a href="https:\/\/sinta\.kemdiktisaintek\.go\.id\/authors\/profile\/\d+">([^<]+)<\/a>/i);
  return nameMatch?.[1]?.trim() || null;
}

function normalizeAffiliationUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('/affiliations/authors/')) {
      parsed.searchParams.set('page', parsed.searchParams.get('page') || '1');
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

function buildGarudaFallbackUrl(authorName: string): string {
  return `https://garuda.kemdiktisaintek.go.id/documents?q=${encodeURIComponent(authorName)}`;
}

function extractPubYear(text: string): string {
  const matches = text.match(/(20\d{2})/g);
  return matches?.[0] || String(new Date().getFullYear());
}

function parseGarudaPublicationsFromHtml(html: string, authorName: string): SintaPublication[] {
  const items = [...html.matchAll(/<div class="ar-list-item mb-5">([\s\S]*?)<\/div>\s*<\/div>/gi)];
  const publications: SintaPublication[] = [];

  for (const item of items) {
    const block = item[1];
    const titleMatch = block.match(/<div class="ar-title">[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const journalMatch = block.match(/<a href="[^"]+" class="ar-pub"[^>]*>[\s\S]*?<\/i>([\s\S]*?)<\/a>/i);
    const yearMatch = block.match(/<a class="ar-year"[^>]*>[\s\S]*?(20\d{2})/i);
    if (!titleMatch) continue;

    const title = titleMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const journal = journalMatch ? journalMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const year = yearMatch?.[1] || extractPubYear(block);
    const source = `${title} ${journal}`.toLowerCase();

    publications.push({
      judul: title,
      tahun: year,
      namaJurnal: journal || 'Garuda',
      jenis: source.includes('prosiding') || source.includes('seminar') ? 'Prosiding' : source.includes('international') || source.includes('internasional') ? 'Jurnal Internasional' : 'Jurnal Nasional',
      sintaId: `${authorName}-${year}-${publications.length + 1}`,
      url: titleMatch[1],
    });
  }

  return publications;
}

async function fetchAuthorProfileHtml(authorId: string): Promise<string> {
  const response = await fetch(`https://sinta.kemdiktisaintek.go.id/authors/profile/${authorId}?view=garuda`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal membuka profil author SINTA (HTTP ${response.status})`);
  }

  return await response.text();
}

async function fetchGarudaPublicationsFromSearch(query: string): Promise<SintaPublication[]> {
  const queryUrl = `https://garuda.kemdiktisaintek.go.id/documents?q=${encodeURIComponent(query)}`;
  const response = await fetch(queryUrl, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) return [];

  const html = await response.text();
  const cards = [...html.matchAll(/<div class=\"ar-list-item mb-5\">([\s\S]*?)<\/div>\s*<\/div>/gi)];
  const publications: SintaPublication[] = [];

  for (const card of cards) {
    const block = card[1];
    const titleMatch = block.match(/<div class=\"ar-title\">[\s\S]*?<a href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/i);
    const journalMatch = block.match(/<a href=\"[^\"]+\" class=\"ar-pub\"[^>]*>[\s\S]*?<\/i>([\s\S]*?)<\/a>/i);
    const yearMatch = block.match(/<a class=\"ar-year\"[^>]*>[\s\S]*?(20\d{2})/i);
    if (!titleMatch) continue;
    const title = titleMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const journal = journalMatch ? journalMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : 'Garuda';
    const year = yearMatch?.[1] || String(new Date().getFullYear());
    publications.push({
      judul: title,
      tahun: year,
      namaJurnal: journal,
      jenis: 'Jurnal Nasional',
      sintaId: `${query.replace(/\s+/g, '-')}-garuda-${publications.length + 1}`,
      url: titleMatch[1],
    });
  }

  return publications;
}

export async function fetchSintaAuthorsFromAffiliation(sourceUrl: string): Promise<{ authors: SintaAuthor[]; affiliationId?: string; affiliationName?: string }> {
  const response = await fetch(sourceUrl, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal membuka halaman SINTA (HTTP ${response.status})`);
  }

  const html = await response.text();
  const authors = extractAffiliationAuthorsFromHtml(html, sourceUrl);
  const meta = extractAffiliationMeta(html);
  return { authors, ...meta };
}

/**
 * Determine publication type based on SINTA data
 */
function determinePublikasiJenis(pub: any): SintaPublication['jenis'] {
  const source = (pub.source || pub.type || pub.jenis || '').toLowerCase();

  if (source.includes('internasional') || source.includes('international')) {
    return 'Jurnal Internasional';
  }
  if (source.includes('nasional') || source.includes('national')) {
    return 'Jurnal Nasional';
  }
  if (source.includes('prosiding') || source.includes('proceeding')) {
    return 'Prosiding';
  }

  // Default to national journal
  return 'Jurnal Nasional';
}

/**
 * Format SINTA publications for the submission form
 */
export function formatSintaPublicationsForForm(
  publications: SintaPublication[]
): Array<{
  judul: string;
  jenis: SintaPublication['jenis'];
  namaJurnal: string;
  tahun: string;
  sintaId: string;
  status: 'Sudah Dipublikasikan';
}> {
  return publications.map(pub => ({
    judul: pub.judul,
    jenis: pub.jenis,
    namaJurnal: pub.namaJurnal,
    tahun: pub.tahun,
    sintaId: pub.sintaId,
    status: 'Sudah Dipublikasikan' as const,
  }));
}

/**
 * Get cached publications without making API call
 */
export function getCachedPublications(profileUrl: string): SintaPublication[] | null {
  const authorId = extractSintaId(profileUrl);
  if (!authorId) return null;

  const cached = cache.get(authorId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  return null;
}

/**
 * Clear all cached SINTA data
 */
export function clearSintaCache(): void {
  cache.clear();
}
