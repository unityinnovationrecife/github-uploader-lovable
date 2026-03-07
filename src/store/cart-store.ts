import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product } from '@/types';

interface CartStore {
  items: CartItem[];
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  addItem: (product: Product, selectedFlavors?: string[], selectedAcomp?: string[]) => void;
  removeItem: (productId: string) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      isCheckoutOpen: false,

      addItem: (product: Product, selectedFlavors?: string[], selectedAcomp?: string[]) => {
        const { items } = get();

        // For products with flavors or accompaniments, always add as new item
        if (product.hasFlavors || (selectedAcomp && selectedAcomp.length > 0)) {
          const uniqueId = `${product.id}-${Date.now()}`;
          set({
            items: [
              ...items,
              { ...product, id: uniqueId, quantity: 1, selectedFlavors, selectedAcomp },
            ],
          });
          return;
        }

        const existingItem = items.find((item) => item.id === product.id);

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ items: [...items, { ...product, quantity: 1 }] });
        }
      },

      removeItem: (productId: string) => {
        set({ items: get().items.filter((item) => item.id !== productId) });
      },

      increaseQuantity: (productId: string) => {
        set({
          items: get().items.map((item) =>
            item.id === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        });
      },

      decreaseQuantity: (productId: string) => {
        const { items } = get();
        const item = items.find((i) => i.id === productId);

        if (item && item.quantity <= 1) {
          set({ items: items.filter((i) => i.id !== productId) });
        } else {
          set({
            items: items.map((i) =>
              i.id === productId ? { ...i, quantity: i.quantity - 1 } : i
            ),
          });
        }
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set({ isCartOpen: !get().isCartOpen }),
      openCheckout: () => set({ isCheckoutOpen: true, isCartOpen: false }),
      closeCheckout: () => set({ isCheckoutOpen: false }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'lanchonete-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
