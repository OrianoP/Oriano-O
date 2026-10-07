import en, { type Messages } from "@/messages/en";
import ar from "@/messages/ar";

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

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
