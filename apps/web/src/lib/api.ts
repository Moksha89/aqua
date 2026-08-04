import type { paths } from './api.generated';

export type ApiPaths = paths;
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export type Session = {
  accessToken: string;
  refreshToken: string;
  businessId?: string;
  userId?: string;
  role?: string;
  financialAccess?: boolean;
};

const SESSION_KEY = 'aqua_session';

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(SESSION_KEY);
  if (!value) return null;
  try { return JSON.parse(value) as Session; } catch { return null; }
}

export function saveSession(session: Session): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem('aqua_access_token', session.accessToken);
}

export function clearSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem('aqua_access_token');
}

async function rotate(): Promise<Session | null> {
  const current = getSession();
  if (!current?.refreshToken) return null;
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  if (!response.ok) return null;
  const next = await response.json() as { accessToken: string; refreshToken: string };
  const session = { ...current, ...next };
  saveSession(session);
  return session;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const session = getSession();
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (session?.accessToken) headers.set('authorization', `Bearer ${session.accessToken}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 401 && retry && await rotate()) return apiRequest<T>(path, init, false);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json() as { message?: string | string[]; error?: { message?: string | string[] } };
      const reason = body.error?.message ?? body.message;
      message = Array.isArray(reason) ? reason.join(', ') : reason ?? message;
    } catch { /* retain status message */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}
