// Shapes returned by the POS public API (oriano-pos-v4 server/online.ts).

export type MenuAddon = {
  id: number;
  name: string;
  category: string | null;
  isFree: boolean;
  priceRegular: number;
  priceXl: number;
};

export type MenuSize = { id: number; name: string; price: number };

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
  sizes: MenuSize[];
  addons: MenuAddon[];
};

export type Menu = {
  categories: { id: number; name: string; slug: string; sortOrder: number | null }[];
  labels: { id: number; categoryId: number | null; name: string; sortOrder: number | null }[];
  products: MenuProduct[];
};

export type DayHours = { open: string; close: string; closed?: boolean };

export type Zone = { id: number; name: string; nameAr: string | null; fee: number; minOrder: number; etaMinutes: number };

export type ShopConfig = {
  open: boolean;
  reason: "paused" | "closed" | null;
  message: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  openingHours: Record<string, DayHours>;
  maxOrderUsd: number;
  pickupMinutes: number;
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
};
