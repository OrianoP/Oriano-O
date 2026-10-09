/**
 * Deals (combos and offers) built in POS → Menu → Deals and sold on the website.
 *
 * A deal is a list of steps ("slots"). Each step is something the customer
 * picks: "2 pizzas from Pizza, any size", "1 drink", or a fixed item like
 * "Fries" (a step with a single choice is filled in automatically).
 *
 * How the deal is priced:
 *  - fixed:      one price for everything ("2 pizzas + 2 drinks = $30")
 *  - free_items: normal prices, but steps marked free cost nothing ("XL pizza + free Pepsi")
 *  - bogo:       the cheapest item of the paid steps is free ("buy 1 get 1")
 *  - percent:    a percentage off the normal prices ("20% off any 2 pizzas")
 *
 * Copied from the POS (oriano-pos-v4 shared/deals.ts) so the price the
 * customer sees is the price the POS charges. Keep the two in sync.
 */
import type { Menu, MenuProduct } from "./types";

export type DealPriceMode = "fixed" | "free_items" | "bogo" | "percent";
export type DealSize = "any" | "regular" | "xl";

export type DealSlot = {
  id: string;
  label: string;             // what one item is: "Pizza", "Drink", "Fries"
  quantity: number;          // how many items the customer picks in this step
  categoryIds: number[];     // pick from these categories…
  productIds: number[];      // …and/or these exact items
  size: DealSize;            // which size the items come in
  free: boolean;             // free_items mode: this step costs nothing
};

export type Deal = {
  id: number;
  name: string;
  nameAr?: string | null;
  tag: string | null;        // badge: "Buy 1 get 1", "Weekend deal"
  description: string | null;
  priceMode: DealPriceMode;
  price: number | null;      // fixed: the deal price
  percent: number | null;    // percent: 1–90
  slots: DealSlot[];
  days: number[];            // 0 = Sunday … 6 = Saturday; empty = every day
  imageUrl?: string | null;
};

/** A priced pick: what the customer chose in a step and its normal price. */
export type DealPick = { slotId: string; productId: number; sizeId?: number | null };
export type PricedPick = DealPick & { normal: number };

export const PRICE_MODES: { value: DealPriceMode; label: string; hint: string }[] = [
  { value: "fixed", label: "One price", hint: "The whole deal costs one price, e.g. 2 pizzas + 2 drinks for $30." },
  { value: "free_items", label: "Free items", hint: "Normal prices, but the steps you mark Free cost nothing, e.g. any XL pizza + a free Pepsi." },
  { value: "bogo", label: "Buy 1 get 1", hint: "The cheapest of the items is free, e.g. buy one pizza, get the second free." },
  { value: "percent", label: "% off", hint: "A percentage off the normal prices, e.g. 20% off any 2 pizzas." },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The deal price for these picks (already checked against the menu). */
export function dealTotal(deal: Pick<Deal, "priceMode" | "price" | "percent" | "slots">, picks: PricedPick[]): number {
  const normal = picks.reduce((s, p) => s + p.normal, 0);
  switch (deal.priceMode) {
    case "fixed":
      return round2(Math.max(0, deal.price ?? normal));
    case "free_items": {
      const free = new Set(deal.slots.filter((s) => s.free).map((s) => s.id));
      return round2(picks.filter((p) => !free.has(p.slotId)).reduce((s, p) => s + p.normal, 0));
    }
    case "bogo": {
      if (picks.length < 2) return round2(normal);
      const cheapest = Math.min(...picks.map((p) => p.normal));
      return round2(normal - cheapest);
    }
    case "percent": {
      const pct = Math.min(90, Math.max(0, deal.percent ?? 0));
      return round2(normal * (1 - pct / 100));
    }
  }
}

/** Splits the deal price across its items (in proportion to their normal prices) so receipts and reports add up. */
export function splitDealPrice(total: number, picks: PricedPick[]): number[] {
  const normal = picks.reduce((s, p) => s + p.normal, 0);
  if (!picks.length) return [];
  const parts = picks.map((p) => (normal > 0 ? round2((total * p.normal) / normal) : round2(total / picks.length)));
  const diff = round2(total - parts.reduce((s, x) => s + x, 0));
  parts[parts.length - 1] = round2(parts[parts.length - 1] + diff);
  return parts;
}

/** Whether a deal runs on this weekday (0 = Sunday). */
export const dealRunsOn = (deal: Pick<Deal, "days">, weekday: number) => !deal.days?.length || deal.days.includes(weekday);

const XL = /xl|45/i;
/** Whether a size of an item can be used in a step. */
export function sizeAllowed(slotSize: DealSize, sizeName: string | null | undefined, itemHasSizes: boolean) {
  if (!itemHasSizes || slotSize === "any") return true;
  const xl = XL.test(sizeName || "");
  return slotSize === "xl" ? xl : !xl;
}

/** Short text for the price, e.g. "$30", "Buy 1 get 1", "20% off". */
export function dealPriceLabel(deal: Pick<Deal, "priceMode" | "price" | "percent">): string {
  if (deal.priceMode === "fixed" && deal.price != null) return `$${Number(deal.price).toFixed(2).replace(/\.00$/, "")}`;
  if (deal.priceMode === "bogo") return "Buy 1 get 1";
  if (deal.priceMode === "percent") return `${deal.percent ?? 0}% off`;
  return "";
}

// ─── Website ─────────────────────────────────────────────────────────────────

/** A deal as the website gets it: each step lists what can fill it right now. */
export type PublicDealSlot = DealSlot & { options: { productId: number; sizeIds: number[] }[] };
export type PublicDeal = Omit<Deal, "slots"> & { slots: PublicDealSlot[]; fromPrice: number };

const normalOf = (p: MenuProduct, sizeId?: number | null) => (p.sizes.length ? p.sizes.find((s) => s.id === sizeId)?.price ?? 0 : p.basePrice);

/** Checks picks against today's menu; null when something is no longer available. */
export function pricePicks(deal: PublicDeal, picks: DealPick[], menu: Pick<Menu, "products">) {
  const out: (PricedPick & { product: MenuProduct; sizeName: string | null })[] = [];
  for (const slot of deal.slots) {
    const mine = picks.filter((p) => p.slotId === slot.id);
    if (mine.length !== slot.quantity) return null;
    for (const pick of mine) {
      const opt = slot.options.find((o) => o.productId === pick.productId);
      const product = menu.products.find((p) => p.id === pick.productId);
      if (!opt || !product || product.soldOut) return null;
      if (product.sizes.length && !opt.sizeIds.includes(Number(pick.sizeId))) return null;
      const size = product.sizes.find((s) => s.id === pick.sizeId);
      out.push({ ...pick, sizeId: size?.id ?? null, normal: normalOf(product, size?.id), product, sizeName: size?.name ?? null });
    }
  }
  return out.length === picks.length ? out : null;
}

/**
 * The deal's tag (e.g. "WEEKEND ONLY") when it adds something: not when it is
 * just the deal's name again, and not an English-only tag on the Arabic page.
 */
export function dealTag(d: { tag?: string | null; name: string; nameAr?: string | null }, lang: string) {
  const raw = (d.tag || "").trim();
  if (!raw) return "";
  const same = [d.name, d.nameAr || ""].some((n) => n.trim().toLowerCase() === raw.toLowerCase());
  if (same) return "";
  if (lang === "ar" && !/[؀-ۿ]/.test(raw)) return "";
  return raw;
}
