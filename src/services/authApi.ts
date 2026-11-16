import type { Prodi, UserAccount, UserRole } from '../types';

type ApiResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function request<T = object>(url: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
    const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string } & T;
    if (!response.ok || result.ok === false) {
      return { ok: false, error: result.error || `Permintaan gagal (HTTP ${response.status}).` };
    }
    return { ...result, ok: true };
  } catch {
    return { ok: false, error: 'Server tidak dapat dihubungi.' };
  }
}

const post = <T = object>(url: string, body: unknown) => request<T>(url, { method: 'POST', body: JSON.stringify(body) });

export const getSession = () => request<{ user: UserAccount | null; hasAdmin: boolean }>('/api/auth/session');

export const loginRequest = (payload: { username: string; password: string; role: UserRole; turnstileToken?: string }) =>
  post<{ user: UserAccount }>('/api/auth/login', payload);

export const setupAdminRequest = (payload: { username: string; password: string; nama: string; turnstileToken?: string }) =>
  post<{ user: UserAccount }>('/api/auth/setup', payload);

export const logoutRequest = () => post('/api/auth/logout', {});

export const changePasswordRequest = (payload: { currentPassword: string; newPassword: string }) =>
  post('/api/auth/password', payload);

export const createAccountRequest = (payload: { dosenId: string; username: string; password: string; nama: string; prodi?: Prodi; nuptk?: string }) =>
  post<{ account: UserAccount; revision: number }>('/api/accounts', payload);

export const deleteAccountRequest = (id: string) =>
  request<{ revision: number }>(`/api/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const resetPasswordRequest = (id: string, password: string) =>
  post(`/api/accounts/${encodeURIComponent(id)}/password`, { password });
