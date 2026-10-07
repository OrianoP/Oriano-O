"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartLine = {
  key: string;            // productId|sizeId|addons|notes — identical choices merge
  productId: number;
  sizeId?: number;
  addonIds: number[];
  notes: string;
  quantity: number;
  // Display snapshot (the POS prices the order itself)
  name: string;
  sizeName?: string;
  addonNames: string[];
  unitPrice: number;
};

type CartState = {
  lines: CartLine[];
  open: boolean;
  add: (line: Omit<CartLine, "key" | "quantity">, quantity: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

const lineKey = (l: Pick<CartLine, "productId" | "sizeId" | "addonIds" | "notes">) =>
  [l.productId, l.sizeId ?? "", [...l.addonIds].sort((a, b) => a - b).join("."), l.notes.trim().toLowerCase()].join("|");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      add: (line, quantity) =>
        set((s) => {
          const key = lineKey(line);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return { lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l)) };
          }
          return { lines: [...s.lines, { ...line, key, quantity }] };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines: quantity <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, quantity) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: "oriano-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

// ─── Orders placed on this device (for "My orders") ──────────────────────────
export type SavedOrder = { orderNumber: string; token: string; total: number; createdAt: string };
const ORDERS_KEY = "oriano-orders";

export function saveOrder(o: SavedOrder) {
  try {
    const list: SavedOrder[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const next = [o, ...list.filter((x) => x.token !== o.token)].slice(0, 20);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  } catch {}
}

export function loadOrders(): SavedOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

// Remember the customer's details for next time (this device only).
const PROFILE_KEY = "oriano-profile";
export type Profile = { name: string; phone: string; zoneId?: number; street?: string; building?: string; floor?: string; landmark?: string };

export function loadProfile(): Partial<Profile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {}
}
