'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '@/lib/types';

type CartContextValue = {
  items: CartItem[]; count: number; subtotal: number;
  add: (product: Product, size: string, color: string, quantity?: number) => void;
  updateQuantity: (index: number, quantity: number) => void; remove: (index: number) => void; clear: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem('wear_it_cart') || '[]')); } catch { setItems([]); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem('wear_it_cart', JSON.stringify(items)); }, [items, hydrated]);
  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    add: (product, size, color, quantity = 1) => setItems((current) => {
      const index = current.findIndex((item) => item.product._id === product._id && item.size === size && item.color === color);
      if (index < 0) return [...current, { product, size, color, quantity }];
      return current.map((item, i) => i === index ? { ...item, quantity: item.quantity + quantity } : item);
    }),
    updateQuantity: (index, quantity) => setItems((current) => current.map((item, i) => i === index ? { ...item, quantity: Math.max(1, quantity) } : item)),
    remove: (index) => setItems((current) => current.filter((_, i) => i !== index)),
    clear: () => setItems([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error('useCart must be used within CartProvider'); return context; }
