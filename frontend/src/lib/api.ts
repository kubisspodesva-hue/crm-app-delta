'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

// Render free tier (a Neon databáze) po nečinnosti "usnou" a probuzení může
// trvat desítky sekund - ale bez časového limitu by `fetch` čekal na odpověď
// klidně navěky, kdyby server vůbec neodpověděl (výpadek, zaseknuté probouzení).
// Appka by pak zůstala trčet na "Načítání…" bez chyby i po hodinách - viz
// DashboardLayout, který loading stav appky drží dokud refreshAccessToken
// nedoběhne. AbortController po timeoutu request zruší, takže se aspoň
// zobrazí chyba / přihlašovací stránka místo věčného točítka.
const FETCH_TIMEOUT_MS = 30000;

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const data = await res.json();
      accessToken = data.accessToken;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  skipAuthRetry?: boolean;
}

export async function apiFetch<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuthRetry } = options;

  const doFetch = async (): Promise<Response> =>
    fetchWithTimeout(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let message = `Chyba požadavku (${res.status})`;
    try {
      const data = await res.json();
      message = data.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T = any>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export { refreshAccessToken };
