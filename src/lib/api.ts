const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/** Turns a stored /uploads/... path into a URL the browser can load. */
export function mediaUrl(value?: string) {
  if (!value) return '';
  if (value.startsWith('/uploads/')) return `${API_ORIGIN}${value}`;
  return value;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Stable identifier for business errors, used to show a translated message. */
    readonly code?: string,
    /** Values a translated sentence interpolates, e.g. the clashing clothing type. */
    readonly params?: Record<string, string | number>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  const isForm = init.body instanceof FormData;
  if (!isForm && init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  } catch {
    // Status 0 means the request never completed; the caller decides how to recover.
    throw new ApiError('Could not reach the Wear It service. Check your connection and try again.', 0);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
      code?: string;
      params?: Record<string, string | number>;
    } | null;
    const message = Array.isArray(payload?.message) ? payload?.message.join(', ') : payload?.message;
    throw new ApiError(
      message || `Request failed (${response.status})`,
      response.status,
      payload?.code,
      payload?.params,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Imports an image from a link. The backend downloads it and stores it as a normal
 * upload, so this returns the same kind of /uploads/... path an upload does.
 */
export async function importImage(sourceUrl: string, token: string | null): Promise<string> {
  const result = await api<{ url: string }>(
    '/uploads/from-url',
    { method: 'POST', body: JSON.stringify({ url: sourceUrl }) },
    token,
  );
  return result.url;
}

/** Uploads one image and returns its stored path. */
export async function uploadImage(file: File, token: string | null): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const result = await api<{ url: string }>('/uploads/image', { method: 'POST', body: form }, token);
  return result.url;
}
