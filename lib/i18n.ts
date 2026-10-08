import en, { type Messages } from "@/messages/en";
import ar from "@/messages/ar";
import type { DayHours } from "./types";

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const TZ = "Asia/Beirut";

const dictionaries: Record<Locale, Messages> = { en, ar };

export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

/** Fills {placeholders} in a message. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));
}

// Menu data comes from the POS in English; translate the shared vocabulary.
const AR_TERMS: Record<string, string> = {
  Pizza: "بيتزا",
  Drinks: "مشروبات",
  Sides: "أطباق جانبية",
  Dips: "صلصات",
  Desserts: "حلويات",
  "Red Base": "القاعدة الحمراء",
  "White Base": "القاعدة البيضاء",
  "Vodka Base": "قاعدة الفودكا",
  "Truffle Base": "قاعدة الترافل",
  "BBQ Base": "قاعدة الباربكيو",
  "Pizza Salad": "بيتزا سلطة",
  "Classic Soda": "مشروبات غازية",
  Water: "مياه",
};

export function term(name: string, locale: Locale) {
  return locale === "ar" ? AR_TERMS[name] ?? name : name;
}

export function sizeLabel(name: string, locale: Locale) {
  if (locale !== "ar") return name;
  return name.replace(/^Regular/i, "عادي").replace(/cm/g, " سم");
}

/** Clock time in Beirut, in the visitor's language. Same output on server and client. */
export function formatTime(d: Date | string, locale: Locale) {
  return new Date(d).toLocaleTimeString(locale === "ar" ? "ar-LB" : "en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}
export function formatDateTime(d: Date | string, locale: Locale) {
  return new Date(d).toLocaleString(locale === "ar" ? "ar-LB" : "en-GB", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
}

/** "12:00" → localized "12:00 PM" / "١٢:٠٠ م" without needing a date. */
export function formatClock(hhmm: string, locale: Locale) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(2024, 0, 1, h, m));
  return d.toLocaleTimeString(locale === "ar" ? "ar-LB" : "en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
}

const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

function beirutNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

/** Today's hours as a display string, or null when closed all day / unknown. */
export function todayHours(hours: Record<string, DayHours> | undefined, locale: Locale) {
  if (!hours || !Object.keys(hours).length) return null;
  const h = hours[String(beirutNow().day)];
  return !h || h.closed ? null : `${formatClock(h.open, locale)} – ${formatClock(h.close, locale)}`;
}

/** When the shop next opens: { today: true, time } or { today: false, day, time }, or null if unknown. */
export function nextOpening(hours: Record<string, DayHours> | undefined, now = new Date()) {
  if (!hours || !Object.keys(hours).length) return null;
  const { day, minutes } = beirutNow(now);
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const h = hours[String(d)];
    if (!h || h.closed) continue;
    if (i === 0 && toMinutes(h.open) <= minutes) continue; // already opened today (so we're after closing)
    return { today: i === 0, day: d, time: h.open };
  }
  return null;
}
