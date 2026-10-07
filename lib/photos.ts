import "server-only";
import { readdirSync } from "fs";
import path from "path";
import { slugify } from "./menu";
import type { Menu } from "./types";

/**
 * Dish photos live in public/photos/menu/<dish-name-slug>.(webp|jpg|png),
 * e.g. "Pepperoni Overload Ranch" → pepperoni-overload-ranch.webp.
 * A photo URL set on the product in the POS wins over the bundled file.
 * Optional page photos: public/photos/hero.(webp|jpg) and public/photos/story.(webp|jpg).
 */
const PHOTO_DIR = path.join(process.cwd(), "public/photos");
const EXT = /\.(webp|jpe?g|png|avif)$/i;

function listPhotos(sub = ""): Map<string, string> {
  const map = new Map<string, string>();
  try {
    for (const f of readdirSync(path.join(PHOTO_DIR, sub))) {
      if (!EXT.test(f)) continue;
      map.set(f.replace(EXT, "").toLowerCase(), `/photos/${sub ? `${sub}/` : ""}${f}`);
    }
  } catch {}
  return map;
}

export function withPhotos(menu: Menu): Menu {
  const photos = listPhotos("menu");
  return {
    ...menu,
    products: menu.products.map((p) => ({ ...p, imageUrl: p.imageUrl || photos.get(slugify(p.name)) || null })),
  };
}

export function pagePhoto(name: "hero" | "story"): string | null {
  return listPhotos().get(name) ?? null;
}
