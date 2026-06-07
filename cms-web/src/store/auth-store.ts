import { create } from 'zustand';
import type { UserVO } from '@/types/auth';
import * as authApi from '@/api/auth';

interface AuthState {
  token: string | null;
  user: UserVO | null;

  setToken: (token: string) => void;
  loadUser: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('cms_token'),
  user: null,

  setToken: (token: string) => {
    localStorage.setItem('cms_token', token);
    set({ token });
  },

  loadUser: async () => {
    try {
      const user = await authApi.getMe();
      set({ user: user as unknown as UserVO });
    } catch {
      get().logout();
    }
  },

  login: async (username: string, password: string) => {
    const result = await authApi.login({ username, password });
    const loginVO = result as unknown as { token: string; username: string; role: string };
    localStorage.setItem('cms_token', loginVO.token);
    set({
      token: loginVO.token,
      user: { username: loginVO.username, role: loginVO.role, status: 1, createdAt: '' },
    });
  },

  logout: () => {
    localStorage.removeItem('cms_token');
    set({ token: null, user: null });
  },

  isAdmin: () => get().user?.role === 'ADMIN',
  isLoggedIn: () => !!get().token,
}));
