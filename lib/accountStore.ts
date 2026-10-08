"use client";

import { create } from "zustand";
import type { AccountMe, AccountState, SavedAddress } from "./account";

/**
 * The customer's account and address book in the browser.
 *
 * Signed in: addresses live on the restaurant's system (any device).
 * Guest: addresses are kept on this phone (localStorage), up to 8.
 * Either way the checkout shows them as cards: tap one and it's filled in.
 */
const GUEST_KEY = "oriano-addresses";
const OLD_PROFILE_KEY = "oriano-profile";

export type AddressInput = Omit<SavedAddress, "id">;

function readGuest(): SavedAddress[] {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_KEY) || "null");
    if (Array.isArray(list)) return list;
    // One-time move of the single address the site used to remember.
    const old = JSON.parse(localStorage.getItem(OLD_PROFILE_KEY) || "{}");
    if (old?.street && old?.zoneId) {
      const moved = [{ id: `l${Date.now()}`, label: "Home", zoneId: Number(old.zoneId), street: old.street, building: old.building || "", floor: old.floor || "", landmark: old.landmark || "" }];
      localStorage.setItem(GUEST_KEY, JSON.stringify(moved));
      return moved;
    }
  } catch {}
  return [];
}
function writeGuest(list: SavedAddress[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(list.slice(0, 8))); } catch {}
}
const same = (a: AddressInput, b: AddressInput) =>
  a.zoneId === b.zoneId && a.street.trim().toLowerCase() === b.street.trim().toLowerCase()
  && a.building.trim().toLowerCase() === b.building.trim().toLowerCase() && (a.floor || "").trim() === (b.floor || "").trim();

async function api(method: string, path: string, body?: unknown): Promise<AccountState> {
  const res = await fetch(`/api/account/${path}`, {
    method, cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || "Something went wrong."), { code: data.code || "server", status: res.status });
  return data;
}

type Store = {
  status: "idle" | "loading" | "ready";
  signedIn: boolean;
  signInAvailable: boolean;
  me: AccountMe | null;
  guestAddresses: SavedAddress[];
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  load: () => Promise<void>;
  startSignIn: (phone: string, lang: string) => Promise<{ devCode?: string }>;
  verify: (phone: string, code: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  addresses: () => SavedAddress[];
  addAddress: (a: AddressInput) => Promise<SavedAddress | null>;
  updateAddress: (id: string, a: AddressInput) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  markUsed: (id: string) => Promise<void>;
};

export const useAccount = create<Store>((set, get) => {
  const apply = (s: AccountState) => set({ signedIn: s.signedIn, me: s.me, signInAvailable: s.signInAvailable, status: "ready" });
  return {
    status: "idle",
    signedIn: false,
    signInAvailable: false,
    me: null,
    guestAddresses: [],
    sheetOpen: false,
    setSheetOpen: (sheetOpen) => set({ sheetOpen }),

    load: async () => {
      if (get().status !== "idle") return;
      set({ status: "loading", guestAddresses: readGuest() });
      try { apply(await api("GET", "me")); } catch { set({ status: "ready" }); }
    },

    startSignIn: async (phone, lang) => {
      const r = (await api("POST", "start", { phone, lang })) as unknown as { devCode?: string };
      return { devCode: r.devCode };
    },

    verify: async (phone, code, name) => {
      apply(await api("POST", "verify", { phone, code, name }));
      // Addresses saved on this phone as a guest move into the account.
      const local = get().guestAddresses;
      for (const a of local) {
        const { id: _id, ...rest } = a;
        if (rest.zoneId) { try { apply(await api("POST", "addresses", rest)); } catch {} }
      }
      if (local.length) { writeGuest([]); set({ guestAddresses: [] }); }
    },

    signOut: async () => {
      try { apply(await api("POST", "logout", {})); } catch { set({ signedIn: false, me: null }); }
    },

    setName: async (name) => { if (get().signedIn) apply(await api("PATCH", "me", { name })); },

    addresses: () => (get().signedIn ? get().me?.addresses ?? [] : get().guestAddresses),

    addAddress: async (a) => {
      if (get().signedIn) {
        const s = await api("POST", "addresses", a);
        apply(s);
        return s.me?.addresses.find((x) => same(x, a)) ?? s.me?.addresses[0] ?? null;
      }
      const list = get().guestAddresses;
      const existing = list.find((x) => same(x, a));
      const saved: SavedAddress = existing ? { ...existing, ...a } : { ...a, id: `l${Date.now()}` };
      const next = [saved, ...list.filter((x) => x.id !== saved.id)];
      writeGuest(next); set({ guestAddresses: next.slice(0, 8) });
      return saved;
    },

    updateAddress: async (id, a) => {
      if (get().signedIn) { apply(await api("PATCH", `addresses/${id}`, a)); return; }
      const next = get().guestAddresses.map((x) => (x.id === id ? { ...x, ...a } : x));
      writeGuest(next); set({ guestAddresses: next });
    },

    removeAddress: async (id) => {
      if (get().signedIn) { apply(await api("DELETE", `addresses/${id}`)); return; }
      const next = get().guestAddresses.filter((x) => x.id !== id);
      writeGuest(next); set({ guestAddresses: next });
    },

    markUsed: async (id) => {
      if (get().signedIn) { try { apply(await api("PATCH", `addresses/${id}`, { used: true })); } catch {} return; }
      const list = get().guestAddresses;
      const hit = list.find((x) => x.id === id);
      if (!hit) return;
      const next = [hit, ...list.filter((x) => x.id !== id)];
      writeGuest(next); set({ guestAddresses: next });
    },
  };
});
