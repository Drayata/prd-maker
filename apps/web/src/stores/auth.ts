import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  locale: 'id' | 'en';
  theme: 'light' | 'dark' | 'system';
  createdAt: string;
}
interface AuthState {
  user: User | null;
  accessToken: string | null;
  initialized: boolean;
  setSession: (user: User, token: string) => void;
  clear: () => void;
  setInitialized: () => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  initialized: false,
  setSession: (user, accessToken) => set({ user, accessToken, initialized: true }),
  clear: () => set({ user: null, accessToken: null, initialized: true }),
  setInitialized: () => set({ initialized: true }),
}));
