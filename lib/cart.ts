"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { unitPrice } from "./menu";
import type { Menu } from "./types";
import { dealTotal, pricePicks, type DealPick } from "./deals";

export const MAX_QTY = 20;
export const MAX_LINES = 30;
const CART_TTL_MS = 48 * 60 * 60 * 1000;

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
  imageUrl?: string | null;
  /** A deal (POS → Menu → Deals): what was picked in each step. productId is 0. */
  deal?: { dealId: number; picks: DealPick[] };
};

export type LastAdded = { name: string; quantity: number; at: number };

type CartState = {
  lines: CartLine[];
  updatedAt: number;
  open: boolean;
  lastAdded: LastAdded | null;
  /** One-off message after the cart was reconciled against a fresh menu. */
  notice: "removed" | "repriced" | null;
  setNotice: (n: "removed" | "repriced" | null) => void;
  add: (line: Omit<CartLine, "key" | "quantity">, quantity: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  dismissAdded: () => void;
  /** Re-prices lines against a fresh menu and drops what's no longer sold. Returns what changed. */
  reconcile: (menu: Menu) => { removed: number; repriced: number };
};

export const lineKey = (l: Pick<CartLine, "productId" | "sizeId" | "addonIds" | "notes" | "deal">) =>
  l.deal
    ? ["deal", l.deal.dealId, l.deal.picks.map((p) => `${p.slotId}.${p.productId}.${p.sizeId ?? ""}`).join(","), l.notes.trim().toLowerCase()].join("|")
    : [l.productId, l.sizeId ?? "", [...l.addonIds].sort((a, b) => a - b).join("."), l.notes.trim().toLowerCase()].join("|");

/** "Beirut Classic (XL)" for each item picked in a deal. */
export const dealPickNames = (picks: { product: { name: string }; sizeName: string | null }[], short: (size: string) => string = (s) => s) =>
  picks.map((p) => (p.sizeName ? `${p.product.name} (${short(p.sizeName)})` : p.product.name));
const shortSize = (s: string) => (/xl|45/i.test(s) ? "XL" : /regular|30/i.test(s) ? "Regular" : s);

/** Pure version of reconcile, so the checkout can preview changes without writing. */
export function reconcileLines(lines: CartLine[], menu: Menu): { lines: CartLine[]; removed: number; repriced: number } {
  let removed = 0;
  let repriced = 0;
  const next = lines.flatMap((l) => {
    if (l.deal) {
      const deal = menu.deals?.find((d) => d.id === l.deal!.dealId);
      const priced = deal ? pricePicks(deal, l.deal.picks, menu) : null;
      if (!deal || !priced) { removed++; return []; }
      const price = dealTotal(deal, priced);
      if (Math.abs(price - l.unitPrice) > 0.004) repriced++;
      return [{ ...l, unitPrice: price, addonNames: dealPickNames(priced, shortSize) }];
    }
    const p = menu.products.find((x) => x.id === l.productId);
    if (!p || p.soldOut) { removed++; return []; }
    const size = p.sizes.length ? p.sizes.find((s) => s.id === l.sizeId) : null;
    if (p.sizes.length && (!size || size.soldOut)) { removed++; return []; }
    const addons = p.addons.filter((a) => l.addonIds.includes(a.id));
    const addonIds = addons.map((a) => a.id);
    const price = unitPrice(p, size ?? null, addonIds);
    if (Math.abs(price - l.unitPrice) > 0.004 || addonIds.length !== l.addonIds.length) repriced++;
    const base = { ...l, productId: p.id, sizeId: size?.id, addonIds, name: p.name, sizeName: size?.name, addonNames: addons.map((a) => a.name), unitPrice: price, imageUrl: p.imageUrl };
    return [{ ...base, key: lineKey(base) }];
  });
  // Two lines can collapse into one key after an extra disappears — merge them.
  const merged: CartLine[] = [];
  for (const l of next) {
    const hit = merged.find((m) => m.key === l.key);
    if (hit) hit.quantity = Math.min(MAX_QTY, hit.quantity + l.quantity);
    else merged.push({ ...l });
  }
  return { lines: merged, removed, repriced };
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      updatedAt: 0,
      open: false,
      lastAdded: null,
      notice: null,
      setNotice: (notice) => set({ notice }),
      add: (line, quantity) =>
        set((s) => {
          const key = lineKey(line);
          const qty = Math.max(1, Math.min(MAX_QTY, quantity));
          const existing = s.lines.find((l) => l.key === key);
          const lastAdded = { name: line.name, quantity: qty, at: Date.now() };
          if (existing) {
            return { updatedAt: Date.now(), lastAdded, lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + qty) } : l)) };
          }
          if (s.lines.length >= MAX_LINES) return s;
          return { updatedAt: Date.now(), lastAdded, lines: [...s.lines, { ...line, key, quantity: qty }] };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          updatedAt: Date.now(),
          lines: quantity <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
        })),
      remove: (key) => set((s) => ({ updatedAt: Date.now(), lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [], updatedAt: Date.now(), lastAdded: null }),
      setOpen: (open) => set({ open, lastAdded: open ? null : get().lastAdded }),
      dismissAdded: () => set({ lastAdded: null }),
      reconcile: (menu) => {
        const r = reconcileLines(get().lines, menu);
        if (r.removed || r.repriced) set({ lines: r.lines, notice: r.removed ? "removed" : "repriced" });
        return { removed: r.removed, repriced: r.repriced };
      },
    }),
    {
      name: "oriano-cart",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, updatedAt: s.updatedAt }),
      // A cart from days ago is more confusing than helpful — start fresh.
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<CartState>;
        const fresh = p.updatedAt && Date.now() - p.updatedAt < CART_TTL_MS;
        return { ...current, lines: fresh ? p.lines || [] : [], updatedAt: fresh ? p.updatedAt! : 0 };
      },
    },
  ),
);

// Keep tabs in sync: an order placed in one tab must not be re-added by another.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "oriano-cart") void useCart.persist.rehydrate();
  });
}

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

// ─── Orders placed on this device (for "My orders") ──────────────────────────
export type SavedOrder = { orderNumber: string; token: string; total: number; createdAt: string; name?: string };
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

// The tracking page greets a customer who has just ordered (once).
const JUST_PLACED_KEY = "oriano-just-placed";
export function markJustPlaced(token: string) {
  try { sessionStorage.setItem(JUST_PLACED_KEY, token); } catch {}
}
export function consumeJustPlaced(token: string) {
  try {
    const hit = sessionStorage.getItem(JUST_PLACED_KEY) === token;
    if (hit) sessionStorage.removeItem(JUST_PLACED_KEY);
    return hit;
  } catch {
    return false;
  }
}

// Remember the customer's details for next time (this device only).
const PROFILE_KEY = "oriano-profile";
export type Profile = { name: string; phone: string; zoneId?: number; street?: string; building?: string; floor?: string; landmark?: string; orderType?: "pickup" | "delivery" };

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
