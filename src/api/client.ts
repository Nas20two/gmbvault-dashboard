// Browser-side API client for the Vercel serverless functions.
import type { Business, BusinessDetail } from '../types';

const TOKEN_KEY = 'gmbvault_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearToken();
    throw new AuthError();
  }
  if (!res.ok) {
    throw new ApiError(res.status, (body as any)?.error ?? 'Request failed');
  }
  return body as T;
}

export class AuthError extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'AuthError';
  }
}
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function login(password: string): Promise<void> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new ApiError(401, (body as any)?.error ?? 'That password didn’t work. Try again.');
  }
  if (res.status === 429) {
    throw new ApiError(429, (body as any)?.error ?? 'Please wait a minute and try again.');
  }
  if (!res.ok) throw new ApiError(res.status, 'Something went wrong. Please try again.');
  setToken((body as any).token);
}

export async function getBusinesses(): Promise<Business[]> {
  return (await request<{ businesses: Business[] }>('/api/businesses')).businesses;
}

export async function getBusiness(slug: string): Promise<BusinessDetail> {
  return (await request<{ business: BusinessDetail }>(`/api/business/${encodeURIComponent(slug)}`)).business;
}

export interface PatchResult {
  business: BusinessDetail;
}
export async function patchBusiness(slug: string, action: string, notes?: string): Promise<BusinessDetail> {
  const r = await request<PatchResult>(`/api/business/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify(notes !== undefined ? { action, notes } : { action }),
  });
  return r.business;
}

export function trackUrl(slug: string, emailHash: string): string {
  return `/api/track?b=${encodeURIComponent(slug)}&e=${encodeURIComponent(emailHash)}`;
}
