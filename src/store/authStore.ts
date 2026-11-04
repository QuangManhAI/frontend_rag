import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '../api/config';

export interface User {
  id: string;
  email: string;
  display_name: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  /**
   * Rotates the token pair after `staleAccessToken` was refused. True when a usable access token is
   * available afterwards. A refused refresh token ends the session; a network failure does not.
   */
  rotateTokens: (staleAccessToken: string) => Promise<boolean>;
}

/** Same-tab callers share one rotation: refresh tokens are single-use. */
let rotation: Promise<boolean> | null = null;

/** Other tabs too: reusing a rotated refresh token would revoke the whole token family. */
function withTabLock<T>(run: () => Promise<T>): Promise<T> {
  const locks = globalThis.navigator?.locks;
  return locks ? (locks.request('rag-token-rotation', run) as Promise<T>) : run();
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  if (res.status === 401) return 'Email hoặc mật khẩu không chính xác.';
  if (res.status === 409) return 'Email này đã được đăng ký tài khoản.';
  if (res.status === 429) return 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau ít phút.';
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const msg = Array.isArray(body?.message) ? body.message[0] : body?.message;
    if (msg?.includes('password too short')) return 'Mật khẩu phải có ít nhất 10 ký tự.';
    if (msg?.includes('invalid email')) return 'Địa chỉ email không hợp lệ.';
    if (msg?.includes('invalid display_name')) return 'Tên hiển thị không hợp lệ.';
    if (msg) return msg;
  } catch {
    // ignore JSON parse failures
  }
  return fallback;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await fetch(`${API_BASE}/auth/tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          throw new Error(await parseErrorMessage(res, 'Đăng nhập thất bại. Vui lòng kiểm tra lại!'));
        }
        const data = await res.json();
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
        });
      },

      register: async (email, password, display_name) => {
        const res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, display_name }),
        });
        if (!res.ok) {
          throw new Error(await parseErrorMessage(res, 'Email đã tồn tại hoặc thông tin không hợp lệ!'));
        }
        const data = await res.json();
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        const { accessToken, refreshToken } = get();
        if (accessToken && refreshToken) {
          void fetch(`${API_BASE}/auth/token-revocations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).catch(() => {});
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      rotateTokens: (staleAccessToken) => {
        rotation ??= withTabLock(async () => {
          // Another tab may have rotated while this one waited for the lock.
          await useAuth.persist?.rehydrate();
          const { accessToken, refreshToken } = get();
          if (accessToken && accessToken !== staleAccessToken) return true;
          if (!refreshToken) return false;
          let res: Response;
          try {
            res = await fetch(`${API_BASE}/auth/token-rotations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
          } catch {
            return false;
          }
          if (!res.ok) {
            if (res.status === 401) {
              set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
            }
            return false;
          }
          const data = await res.json();
          set({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token, isAuthenticated: true });
          return true;
        }).finally(() => {
          rotation = null;
        });
        return rotation;
      },
    }),
    {
      name: 'rag-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
