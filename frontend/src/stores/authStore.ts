import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { useCartStore } from './cartStore';

interface User {
  id: number;
  email: string;
  rol: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (val) => set({ hasHydrated: val }),
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { accessToken, refreshToken, user } = res.data;
          localStorage.setItem('refreshToken', refreshToken);
          set({ user, accessToken, isAuthenticated: true });

          const localItems = useCartStore.getState().items.map((item) => ({
            id_producto: item.id_producto,
            id_variante: item.id_variante,
            cantidad: item.cantidad,
          }));

          try {
            const sync = await api.post('/carrito/sync-local', { items: localItems });
            const backendItems = sync.data?.carrito?.items || [];
            useCartStore.getState().replaceItems(
              backendItems.map((item: any) => ({
                id_producto: item.id_producto,
                id_variante: item.id_variante || undefined,
                nombre: item.producto?.nombre || 'Producto',
                cantidad: item.cantidad,
                precio: Number(item.producto?.precio_venta || 0),
                imagen: item.producto?.imagenes?.[0]?.url || '',
              }))
            );
          } catch {
            // Keep local cart if sync fails; do not block login.
          }
        } finally {
          set({ isLoading: false });
        }
      },
      logout: () => {
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      refreshToken: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await api.post('/auth/refresh', { refreshToken });
        const { accessToken } = res.data;
        set({ accessToken });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
