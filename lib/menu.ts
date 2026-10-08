import type { MenuAddon, MenuProduct, MenuSize } from "./types";

// Wrapped in LTR-isolate marks so "$12" never flips to "12$" inside Arabic text.
export const money = (n: number) => `\u2066$${(Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "")}\u2069`;

export const isXl = (size?: Pick<MenuSize, "name"> | null) => /xl|45/i.test(size?.name || "");

export function addonPrice(a: MenuAddon, size?: MenuSize | null) {
  return a.isFree ? 0 : isXl(size) ? a.priceXl : a.priceRegular;
}

/** Unit price the POS will charge (the POS recalculates — this is for display). */
export function unitPrice(p: MenuProduct, size: MenuSize | null | undefined, addonIds: number[]) {
  const base = size ? size.price : p.basePrice;
  return base + p.addons.filter((a) => addonIds.includes(a.id)).reduce((s, a) => s + addonPrice(a, size), 0);
}

export function fromPrice(p: MenuProduct) {
  return p.sizes.length ? Math.min(...p.sizes.map((s) => s.price)) : p.basePrice;
}

/** POS descriptions carry a " — Red Base — 30cm · 45cm" suffix; keep just the ingredients. */
export function cleanDescription(d: string | null) {
  return (d || "").split(" — ")[0].replace(/\.$/, "").trim();
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
