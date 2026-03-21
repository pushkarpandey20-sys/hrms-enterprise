import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  userId: string;
  organizationId: string;
  role: string;
  employeeId?: string;
  email?: string;
  name?: string;
  photoUrl?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      user: null,
      login: (accessToken, refreshToken, user) =>
        set({ isAuthenticated: true, accessToken, refreshToken, user }),
      logout: () =>
        set({ isAuthenticated: false, accessToken: null, refreshToken: null, user: null }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
    }),
    { name: 'hrms-auth', partialize: (s) => ({ isAuthenticated: s.isAuthenticated, accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }) },
  ),
);
