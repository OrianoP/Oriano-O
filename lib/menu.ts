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

/*
 * Half & half: two real pizzas with the same base (Red with Red, White with
 * White…), same size, priced as the average of the two pies. Same rules as
 * the POS, which checks them again when the order comes in.
 */
export function halfEligible(p: MenuProduct, labels: { id: number; name: string }[]) {
  if (p.itemType !== "pizza" || p.soldOut || p.labelId == null || !p.sizes.length) return false;
  if (/salad/i.test(labels.find((l) => l.id === p.labelId)?.name || "")) return false;
  return !/^(half|½)\b/i.test(p.name.trim()) && !/half\s*[&+/]\s*half/i.test(p.name);
}
/** The pizzas that can be the other half of `p`. */
export function halfPartners(p: MenuProduct, menu: { products: MenuProduct[]; labels: { id: number; name: string }[] }) {
  if (!halfEligible(p, menu.labels)) return [];
  return menu.products.filter((x) => x.id !== p.id && x.labelId === p.labelId && halfEligible(x, menu.labels));
}
/** The partner's size matching the chosen one (same name, or the same Regular/XL). */
export function halfSize(partner: MenuProduct, size: MenuSize | null | undefined) {
  if (!size) return undefined;
  return partner.sizes.find((s) => s.name === size.name) ?? partner.sizes.find((s) => isXl(s) === isXl(size));
}
/** Price of one half & half pie (with extras), or null when that size isn't available. */
export function halfUnitPrice(p: MenuProduct, size: MenuSize | null | undefined, partner: MenuProduct, addonIds: number[]) {
  const ps = halfSize(partner, size);
  if (!size || !ps || ps.soldOut) return null;
  const base = Math.round(((size.price + ps.price) / 2) * 100) / 100;
  return base + p.addons.filter((a) => addonIds.includes(a.id)).reduce((s, a) => s + addonPrice(a, size), 0);
}
// LTR isolate: the English names keep "½ A / ½ B" order on the Arabic page too.
export const halfName = (p: { name: string }, partner: { name: string }) => `\u2066½ ${p.name} / ½ ${partner.name}\u2069`;

export function fromPrice(p: MenuProduct) {
  return p.sizes.length ? Math.min(...p.sizes.map((s) => s.price)) : p.basePrice;
}

/** POS descriptions carry a " — Red Base — 30cm · 45cm" suffix; keep just the ingredients. */
export function cleanDescription(d: string | null) {
  return (d || "").split(" — ")[0].replace(/\.$/, "").trim();
}

/*
 * Arabic for the ingredients. Menu text comes from the POS in English, so each
 * comma-separated ingredient is looked up here; anything not listed stays in
 * English rather than being guessed.
 */
const AR_INGREDIENTS: Record<string, string> = {
  "tomato base": "قاعدة صلصة البندورة",
  "red base": "قاعدة صلصة البندورة",
  "bbq base": "قاعدة صلصة الباربكيو",
  "white base": "القاعدة البيضاء",
  "truffle base": "قاعدة الترافل",
  "olive oil base": "قاعدة زيت الزيتون",
  "vodka sauce": "صلصة الفودكا",
  "vodka base": "قاعدة الفودكا",
  "mozzarella cheese blend": "مزيج جبنة الموزاريلا",
  "mozzarella blend": "مزيج جبنة الموزاريلا",
  "mozzarella cheese": "جبنة موزاريلا",
  "mozzarella": "موزاريلا",
  "light mozzarella": "موزاريلا خفيفة",
  "fresh mozzarella": "موزاريلا طازجة",
  "parmigiano reggiano": "جبنة بارميجانو ريجانو",
  "parmesan": "جبنة بارميزان",
  "pecorino romano": "جبنة بيكورينو رومانو",
  "provolone": "جبنة بروفولون",
  "blue cheese": "جبنة زرقاء",
  "goat cheese": "جبنة الماعز",
  "chicken": "دجاج",
  "ham": "هام",
  "pepperoni": "بيبروني",
  "classic pepperoni": "بيبروني كلاسيك",
  "triple pepperoni": "بيبروني مضاعف ثلاث مرات",
  "extra pepperoni": "بيبروني إضافي",
  "italian sausage": "سجق إيطالي",
  "sausage": "سجق",
  "prosciutto cotto": "بروشوتو كوتو",
  "honey on the crust": "عسل على الحافة",
  "served with bbq and ranch dips": "مع صلصة باربكيو وصلصة رانش على الجنب",
  "chorizo sausage": "سجق شوريزو",
  "chorizo": "شوريزو",
  "fresh mushroom": "فطر طازج",
  "fresh mushrooms": "فطر طازج",
  "mushrooms": "فطر",
  "mushroom": "فطر",
  "sautéed mushrooms": "فطر سوتيه",
  "extra mushrooms": "فطر إضافي",
  "onions": "بصل",
  "onion": "بصل",
  "green onions": "بصل أخضر",
  "jalapeño": "هالابينو",
  "jalapeños": "هالابينو",
  "jalapenos": "هالابينو",
  "artichoke": "أرضي شوكي",
  "oregano": "أوريغانو",
  "chili flakes": "رقائق الفلفل الحار",
  "mesclun": "خس مشكّل",
  "cherry tomatoes": "بندورة كرزية",
  "balsamic": "صلصة البلسميك",
  "truffle oil drizzle": "رشّة زيت الترافل",
  "olive oil drizzle": "رشّة زيت الزيتون",
  "bbq drizzle": "رشّة صلصة الباربكيو",
  "hot honey drizzle": "رشّة العسل الحار",
  "hot honey": "عسل حار",
  "ranch drizzle": "رشّة صلصة الرانش",
  "buffalo drizzle": "رشّة صلصة البافلو",
  "house ranch sauce": "صلصة الرانش الخاصة بنا",
  "house ranch": "صلصة الرانش الخاصة بنا",
  "ranch": "صلصة الرانش",
  "complete your meal": "كمّل وجبتك",
  // Whole descriptions that aren't ingredient lists
  "crispy golden fries": "بطاطا مقلية ذهبية ومقرمشة",
  "classic cheese pizza slice": "شريحة بيتزا بالجبنة كلاسيك",
  "cheese pizza slice with your topping": "شريحة بيتزا بالجبنة مع الإضافة التي تختارها",
};
const arWord = (s: string) => AR_INGREDIENTS[s.trim().toLowerCase().replace(/\.$/, "")];

/** The item's ingredients in the visitor's language (t.dir is "rtl" for Arabic). */
export function describe(description: string | null, t: { dir: string }) {
  const d = cleanDescription(description);
  if (t.dir !== "rtl" || !d) return d;
  const whole = arWord(d);
  if (whole) return whole;
  const size = d.match(/^(\d+)\s*(ml|cc)(\s+can)?$/i); // "330ml can", "50cc"
  if (size) return `${size[3] ? "علبة " : ""}${size[1]} مل`;
  // Each comma part as a whole first ("served with BBQ and ranch dips"), then its "and" pieces.
  return d
    .split(/\s*,\s*/)
    .filter(Boolean)
    .map((part) => arWord(part) ?? part.split(/\s+and\s+|\s*&\s*/i).map((w) => arWord(w) ?? w).join(" و"))
    .join("، ");
}

/** An extra's name in the visitor's language, for display only (the POS gets the English name). */
export const extraName = (name: string, t: { dir: string }) => (t.dir === "rtl" ? arWord(name) ?? name : name);

/**
 * One-tap add-ons offered in the cart (simple items only). The owner's best
 * sellers lead: Ranch and Hot Honey are the only dips offered (other dips only
 * if both are missing), then drinks with Pepsi Diet and Pepsi Max first.
 */
const TOP_DIPS = [/^ranch( (dip|sauce))?$/i, /^hot honey( (dip|sauce))?$/i];
const TOP_DRINKS = [/^(pepsi diet|diet pepsi)$/i, /^pepsi max$/i];
const rank = (p: MenuProduct, top: RegExp[]) => {
  const i = top.findIndex((re) => re.test(p.name.trim().replace(/\s+/g, " ")));
  return i < 0 ? top.length : i;
};
/** Drinks with the best sellers (Pepsi Diet, Pepsi Max) first. */
export const drinksFirst = (list: MenuProduct[]) => [...list].sort((a, b) => rank(a, TOP_DRINKS) - rank(b, TOP_DRINKS));
export type CartSuggestion = { id: number; name: string; price: number; sizeId?: number; sizeName?: string; imageUrl: string | null };
export function cartSuggestions(menu: { products: MenuProduct[] }): CartSuggestion[] {
  const simple = (p: MenuProduct) => !p.soldOut && p.sizes.length <= 1;
  const pick = (kind: "dip" | "drink", top: RegExp[]) =>
    menu.products.filter((p) => simple(p) && itemKind(p) === kind).sort((a, b) => rank(a, top) - rank(b, top));
  const dips = pick("dip", TOP_DIPS);
  const topDips = dips.filter((p) => rank(p, TOP_DIPS) < TOP_DIPS.length);
  return [...(topDips.length ? topDips : dips.slice(0, 2)), ...pick("drink", TOP_DRINKS)].slice(0, 10).map((p) => {
    const s = p.sizes[0];
    return { id: p.id, name: p.name, price: s ? s.price : p.basePrice, sizeId: s?.id, sizeName: s?.name, imageUrl: p.imageUrl };
  });
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/*
 * What an item can be customised with. Drinks: nothing (no extras, no
 * instructions). Fries and other sides: instructions only. Dips: no extras.
 * Goes by type and, as a safety net, by name.
 */
const DRINK = /water|pepsi|7 ?up|miranda|ice ?tea|cola|soda|juice|lemonade|energy|drink/i;
const DIP = /ranch|buffalo|sauce|dip|garlic mayo|honey mustard/i;
const SIDE = /fries|wedges|nuggets|wings/i;
export function itemKind(p: Pick<MenuProduct, "itemType" | "name">): "drink" | "dip" | "side" | "food" {
  const t = String(p.itemType || "");
  if (t === "pizza" || t === "slice") return "food";
  if (t === "drink" || DRINK.test(p.name)) return "drink";
  if (t === "dip" || DIP.test(p.name)) return "dip";
  if (t === "side" || SIDE.test(p.name)) return "side";
  return "food";
}
export const allowsExtras = (p: Pick<MenuProduct, "itemType" | "name">) => itemKind(p) === "food";
export const allowsNotes = (p: Pick<MenuProduct, "itemType" | "name">) => itemKind(p) !== "drink";
