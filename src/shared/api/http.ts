import { useAuth } from '../../features/auth/authStore';
import { API_BASE } from './config';

/** The one page shape every list endpoint of the API returns. */
export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}

/**
 * Every authenticated call to RAG_TS goes through here: it attaches the access token and, on a 401,
 * rotates the token pair once and repeats the request. A failed rotation returns the original 401.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  const token = useAuth.getState().accessToken;
  const res = await send(token);
  if (res.status !== 401 || !token) return res;
  const rotated = await useAuth.getState().rotateTokens(token);
  return rotated ? send(useAuth.getState().accessToken) : res;
}

/** Follows `next_cursor` until the end of a list, or until `maxPages` as a safety bound. */
export async function fetchAllPages<T>(
  path: string,
  params: Record<string, string>,
  maxPages: number,
  init: () => RequestInit = () => ({}),
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const query: string = new URLSearchParams({ ...params, ...(cursor ? { cursor } : {}) }).toString();
    const res = await apiFetch(`${path}?${query}`, init());
    if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
    const data = (await res.json()) as CursorPage<T>;
    items.push(...data.items);
    cursor = data.next_cursor;
    if (!cursor) break;
  }
  return items;
}
