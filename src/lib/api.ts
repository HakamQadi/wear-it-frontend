const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function mediaUrl(value?: string) {
  if (!value) return '/demo/placeholder.svg';
  if (value.startsWith('/uploads/')) return `${API_ORIGIN}${value}`;
  return value;
}

export async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload?.message.join(', ') : payload?.message;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
