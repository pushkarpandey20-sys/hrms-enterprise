import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  userId: string;
  organizationId: string;
  role: string;
  employeeId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ isAuthenticated: true, user });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user');
    set({ isAuthenticated: false, user: null });
  },
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const userStr = await SecureStore.getItemAsync('user');
      if (token && userStr) {
        set({ isAuthenticated: true, user: JSON.parse(userStr) });
      }
    } catch {}
  },
}));
