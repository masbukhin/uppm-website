import type { PublicPost, PublicStats } from '../types';

type ApiResult<T> = ({ ok: true; error?: undefined } & T) | { ok: false; error: string };

async function request<T>(url: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
    const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string } & T;
    if (!response.ok || result.ok === false) return { ok: false, error: result.error || `Permintaan gagal (HTTP ${response.status}).` };
    return { ...result, ok: true, error: undefined };
  } catch {
    return { ok: false, error: 'Server tidak dapat dihubungi.' };
  }
}

export const getPublicHome = () => request<{ posts: PublicPost[]; stats: PublicStats }>('/api/public/home');

export const listAllPosts = () => request<{ posts: PublicPost[] }>('/api/public-posts');

export const savePost = (post: Partial<PublicPost>) =>
  request<{ post: PublicPost }>('/api/public-posts', { method: 'POST', body: JSON.stringify(post) });

export const deletePost = (id: string) =>
  request<object>(`/api/public-posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
