// Shapes returned by the POS public API (oriano-pos-v4 server/online.ts).
import type { PublicDeal } from "./deals";

export type MenuAddon = {
  id: number;
  name: string;
  category: string | null;
  isFree: boolean;
  priceRegular: number;
  priceXl: number;
};

export type MenuSize = { id: number; name: string; price: number; soldOut?: boolean };

export type MenuProduct = {
  id: number;
  categoryId: number | null;
  labelId: number | null;
  name: string;
  description: string | null;
  itemType: "pizza" | "drink" | "side" | "dessert" | "dip" | string;
  basePrice: number;
  imageUrl: string | null;
  isFeatured: boolean;
  /** Set in the POS (Menu → 🔥): shown first on the site with this label. */
  offerTag?: string | null;
  /** Optional "was" price, crossed out next to the offer price. */
  compareAtPrice?: number | null;
  /** 86'd in the POS: shown but not orderable until it's back. */
  soldOut?: boolean;
  sizes: MenuSize[];
  addons: MenuAddon[];
};

export type Menu = {
  categories: { id: number; name: string; slug: string; sortOrder: number | null }[];
  labels: { id: number; categoryId: number | null; name: string; sortOrder: number | null }[];
  products: MenuProduct[];
  /** Combos and offers built in the POS (Menu → Deals), running today. */
  deals?: PublicDeal[];
};

export type DayHours = { open: string; close: string; closed?: boolean };

export type Zone = { id: number; name: string; nameAr: string | null; fee: number; minOrder: number; etaMinutes: number; aliases?: string | null; region?: string | null };

export type ShopConfig = {
  open: boolean;
  reason: "paused" | "closed" | null;
  message: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  openingHours: Record<string, DayHours>;
  maxOrderUsd: number;
  pickupMinutes: number;
  /** Live estimate from the kitchen's current load (pickup; delivery adds the zone's minutes). */
  eta?: { pickupMinutes: number; kitchenOrders: number };
  shopPhone: string;
  whatsapp: string;
  zones: Zone[];
  /** Set by the site when the POS couldn't be reached — the rest of the config is a placeholder. */
  unreachable?: boolean;
};

export type Stage =
  | "awaiting_confirmation" | "confirmed" | "preparing" | "in_oven" | "ready"
  | "out_for_delivery" | "completed" | "cancelled";

export type TrackedOrder = {
  orderNumber: string;
  stage: Stage;
  orderType: "pickup" | "delivery";
  createdAt: string;
  confirmedAt: string | null;
  estimatedReadyAt: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  customerFirstName: string | null;
  deliveryArea: string | null;
  items: { name: string; size: string | null; quantity: number; totalPrice: number; notes: string | null; extras: string[] }[];
  subtotal: number;
  discountAmount?: number;
  couponCode?: string | null;
  deliveryFee: number;
  total: number;
  paymentMethod: string | null;
  shopPhone: string;
  whatsapp: string;
};

export type PlaceOrderInput = {
  orderType: "pickup" | "delivery";
  customer: { name: string; phone: string };
  address?: { zoneId: number; street: string; building: string; floor?: string; landmark?: string };
  items: { productId: number; sizeId?: number; quantity: number; addonIds: number[]; notes?: string }[];
  notes?: string;
  couponCode?: string;
};
