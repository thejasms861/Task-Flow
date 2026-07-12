import { create } from 'zustand';
import axios from 'axios';
import apiClient from '../api/axios';

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  avatar_color: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, display_name: string) => Promise<any>;
  logout: () => void;
  refreshTokenFn: () => Promise<boolean>;
  loadUser: () => Promise<void>;
  verifyEmail: (email: string, code: { otp?: string; token?: string }) => Promise<void>;
  resendVerification: (email: string) => Promise<any>;
  socialLogin: (provider: string, code: string, redirectUri: string, mockData?: { email?: string; name?: string; avatar_url?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isLoading: true,

  login: async (email, password) => {
    try {
      const res = await apiClient.post('/auth/login/', { email, password });
      const { access_token, refresh_token, user } = res.data.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      set({ user, accessToken: access_token, refreshToken: refresh_token });
    } catch (e: any) {
      throw e;
    }
  },

  register: async (email, password, display_name) => {
    try {
      const res = await apiClient.post('/auth/register/', { email, password, display_name });
      return res.data.data;
    } catch (e: any) {
      throw e;
    }
  },

  verifyEmail: async (email, code) => {
    try {
      const res = await apiClient.post('/auth/verify-email/', { email, ...code });
      const { access_token, refresh_token, user } = res.data.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      set({ user, accessToken: access_token, refreshToken: refresh_token });
    } catch (e: any) {
      throw e;
    }
  },

  resendVerification: async (email) => {
    try {
      const res = await apiClient.post('/auth/resend-verification/', { email });
      return res.data.data;
    } catch (e: any) {
      throw e;
    }
  },

  socialLogin: async (provider, code, redirectUri, mockData = {}) => {
    try {
      const res = await apiClient.post('/auth/social/login/', {
        provider,
        code,
        redirect_uri: redirectUri,
        ...mockData
      });
      const { access_token, refresh_token, user } = res.data.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      set({ user, accessToken: access_token, refreshToken: refresh_token });
    } catch (e: any) {
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  refreshTokenFn: async () => {
    const refresh = get().refreshToken;
    if (!refresh) return false;
    try {
      const res = await axios.post(`${apiClient.defaults.baseURL}/auth/token/refresh/`, { refresh_token: refresh });
      const newAccess = res.data.data.access_token;
      localStorage.setItem('access_token', newAccess);
      set({ accessToken: newAccess });
      return true;
    } catch (e) {
      get().logout();
      return false;
    }
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      if (get().accessToken) {
        const res = await apiClient.get('/auth/me/');
        set({ user: res.data.data });
      }
    } catch (e) {
      // Ignored
    } finally {
      set({ isLoading: false });
    }
  }
}));
