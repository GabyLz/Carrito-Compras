import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id_producto: number;
  id_variante?: number;
  nombre: string;
  cantidad: number;
  precio: number;
  imagen: string;
  stock?: number;
}

interface CartState {
  items: CartItem[];
  coupon: string | null;
  hasHydrated: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id_producto: number, id_variante?: number) => void;
  updateQuantity: (id_producto: number, cantidad: number, id_variante?: number) => void;
  replaceItems: (items: CartItem[]) => void;
  setCoupon: (coupon: string | null) => void;
  clearCart: () => void;
  setHasHydrated: (val: boolean) => void;
}

const normalizeVariantId = (id_variante?: number | null) => (typeof id_variante === 'number' ? id_variante : undefined);
const normalizeStock = (stock?: number | null) => {
  const value = Number(stock);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
};

const clampQuantity = (cantidad: number, stock?: number) => {
  const safeCantidad = Math.max(Number(cantidad || 1), 1);
  return typeof stock === 'number' ? Math.min(safeCantidad, stock) : safeCantidad;
};

const mergeStock = (left?: number, right?: number) => {
  if (typeof left === 'number' && typeof right === 'number') return Math.min(left, right);
  return typeof left === 'number' ? left : right;
};

const getItemKey = (item: Pick<CartItem, 'id_producto' | 'id_variante'>) =>
  `${item.id_producto}:${normalizeVariantId(item.id_variante) ?? 'base'}`;

const sameItem = (
  a: Pick<CartItem, 'id_producto' | 'id_variante'>,
  b: Pick<CartItem, 'id_producto' | 'id_variante'>
) => a.id_producto === b.id_producto && normalizeVariantId(a.id_variante) === normalizeVariantId(b.id_variante);

const sanitizeItems = (items: CartItem[]): CartItem[] =>
  (Array.isArray(items) ? items : []).map((item) => {
    const stock = normalizeStock(item.stock);
    return {
      ...item,
      id_variante: normalizeVariantId(item.id_variante),
      stock,
      cantidad: clampQuantity(Number(item.cantidad || 1), stock),
    };
  });

const mergeCartItems = (left: CartItem[], right: CartItem[]): CartItem[] => {
  const merged = new Map<string, CartItem>();

  [...left, ...right].forEach((item) => {
    const stock = normalizeStock(item.stock);
    const normalized: CartItem = {
      ...item,
      id_variante: normalizeVariantId(item.id_variante),
      cantidad: clampQuantity(Number(item.cantidad || 1), stock),
      stock,
    };
    const key = getItemKey(normalized);
    const existing = merged.get(key);

    if (existing) {
      const mergedStock = mergeStock(existing.stock, normalized.stock);
      merged.set(key, {
        ...existing,
        stock: mergedStock,
        cantidad: clampQuantity(existing.cantidad + normalized.cantidad, mergedStock),
      });
      return;
    }

    merged.set(key, normalized);
  });

  return Array.from(merged.values());
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      coupon: null,
      hasHydrated: false,
      setHasHydrated: (val) => set({ hasHydrated: val }),
      addItem: (item) =>
        set((state) => {
          const stock = normalizeStock(item.stock);
          const normalizedItem: CartItem = {
            ...item,
            id_variante: normalizeVariantId(item.id_variante),
            cantidad: clampQuantity(Number(item.cantidad || 1), stock),
            stock,
          };

          if (typeof normalizedItem.stock === 'number' && normalizedItem.stock <= 0) {
            return { items: state.items };
          }

          const existing = state.items.find((i) => sameItem(i, normalizedItem));

          if (existing) {
            const mergedStock = mergeStock(existing.stock, normalizedItem.stock);
            return {
              items: state.items.map((i) =>
                sameItem(i, normalizedItem)
                  ? {
                      ...i,
                      stock: mergedStock,
                      cantidad: clampQuantity(i.cantidad + normalizedItem.cantidad, mergedStock),
                    }
                  : i
              ),
            };
          }

          return { items: [...state.items, normalizedItem] };
        }),
      removeItem: (id_producto, id_variante) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !sameItem(i, { id_producto, id_variante })
          ),
        })),
      updateQuantity: (id_producto, cantidad, id_variante) =>
        set((state) => ({
          items: state.items.map((i) =>
            sameItem(i, { id_producto, id_variante })
              ? { ...i, cantidad: clampQuantity(Number(cantidad || 1), i.stock) }
              : i
          ),
        })),
      replaceItems: (items) => set({ items: sanitizeItems(items) }),
      setCoupon: (coupon) => set({ coupon }),
      clearCart: () => set({ items: [], coupon: null }),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => {
        const { hasHydrated: _hasHydrated, ...rest } = state;
        return rest;
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<CartState>) || {};
        return {
          ...currentState,
          ...persisted,
          items: mergeCartItems(sanitizeItems(currentState.items), sanitizeItems(persisted.items || [])),
          coupon: persisted.coupon ?? currentState.coupon,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
