import "server-only";
import { createHmac } from "crypto";
import sampleMenu from "@/data/sample-menu.json";
import type { Menu, ShopConfig, TrackedOrder } from "./types";

/**
 * Server-side client for the POS public API. Every request is signed with
 * ONLINE_ORDERS_SECRET (HMAC-SHA256 of `timestamp.METHOD.path.body`) — the
 * secret never reaches the browser and never travels over the network.
 */
const POS_URL = process.env.POS_API_URL?.replace(/\/$/, "");
const SECRET = process.env.ONLINE_ORDERS_SECRET;

/** Without POS settings the site runs in preview mode on a bundled sample menu, with ordering disabled. */
export const PREVIEW_MODE = !POS_URL || !SECRET;
if (PREVIEW_MODE && process.env.NODE_ENV === "production") {
  console.warn("[pos] POS_API_URL / ONLINE_ORDERS_SECRET not set — preview mode (ordering disabled).");
}

export class PosError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type FetchOpts = { body?: unknown; customerIp?: string; revalidate?: number | false; tags?: string[] };

async function posFetch<T>(method: "GET" | "POST", path: string, opts: FetchOpts = {}): Promise<T> {
  if (PREVIEW_MODE) throw new PosError(503, "preview", "Online ordering is not connected yet.");
  const body = opts.body === undefined ? "" : JSON.stringify(opts.body);
  const ts = String(Date.now());
  const signature = createHmac("sha256", SECRET!).update(`${ts}.${method}.${path}.${body}`).digest("hex");
  const headers: Record<string, string> = {
    "x-oriano-timestamp": ts,
    "x-oriano-signature": signature,
  };
  if (body) headers["content-type"] = "application/json";
  if (opts.customerIp) headers["x-customer-ip"] = opts.customerIp;

  let res: Response;
  try {
    res = await fetch(`${POS_URL}${path}`, {
      method,
      headers,
      body: body || undefined,
      signal: AbortSignal.timeout(12_000),
      ...(opts.revalidate === false || opts.revalidate === undefined
        ? { cache: "no-store" as const }
        : { next: { revalidate: opts.revalidate, tags: opts.tags } }),
    });
  } catch {
    throw new PosError(503, "unreachable", "We can't reach the restaurant right now. Please try again or call us.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PosError(res.status, data.code || "error", data.message || "Something went wrong.");
  return data as T;
}

export async function getMenu(): Promise<Menu> {
  if (PREVIEW_MODE) return sampleMenu as Menu;
  return posFetch<Menu>("GET", "/api/public/menu", { revalidate: 60, tags: ["menu"] });
}

const PREVIEW_CONFIG: ShopConfig = {
  open: false,
  reason: "paused",
  message: "Online ordering opens soon — call us to order!",
  pickupEnabled: true,
  deliveryEnabled: false,
  openingHours: Object.fromEntries(Array.from({ length: 7 }, (_, d) => [String(d), { open: "12:00", close: "23:30" }])),
  maxOrderUsd: 150,
  pickupMinutes: 20,
  shopPhone: "+961 3 515 078",
  whatsapp: "9613515078",
  zones: [],
};

/** Shop status changes minute to minute (pause switch, hours) — cache briefly. */
export async function getConfig(): Promise<ShopConfig> {
  if (PREVIEW_MODE) return PREVIEW_CONFIG;
  return posFetch<ShopConfig>("GET", "/api/public/config", { revalidate: 15, tags: ["config"] });
}

export async function getConfigFresh(): Promise<ShopConfig> {
  if (PREVIEW_MODE) return PREVIEW_CONFIG;
  return posFetch<ShopConfig>("GET", "/api/public/config");
}

export function placeOrder(body: unknown, customerIp: string) {
  return posFetch<{ orderNumber: string; trackingToken: string; total: number; duplicate?: boolean }>(
    "POST", "/api/public/orders", { body, customerIp },
  );
}

export function trackOrder(token: string) {
  return posFetch<TrackedOrder>("GET", `/api/public/orders/${encodeURIComponent(token)}`);
}
