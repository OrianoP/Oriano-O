import "server-only";
import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
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

// "?v=<content hash>" so a replaced photo gets a new URL and no cache
// (browser, CDN or the image optimiser) keeps serving the old one.
const versions = new Map<string, { stamp: string; v: string }>();
function version(file: string): string {
  try {
    const st = statSync(file);
    const stamp = `${st.size}:${st.mtimeMs}`;
    const hit = versions.get(file);
    if (hit?.stamp === stamp) return hit.v;
    const v = createHash("sha1").update(readFileSync(file)).digest("hex").slice(0, 10);
    versions.set(file, { stamp, v });
    return v;
  } catch {
    return "0";
  }
}

function listPhotos(sub = ""): Map<string, string> {
  const map = new Map<string, string>();
  try {
    for (const f of readdirSync(path.join(PHOTO_DIR, sub))) {
      if (!EXT.test(f)) continue;
      const rel = `${sub ? `${sub}/` : ""}${f}`;
      map.set(f.replace(EXT, "").toLowerCase(), `/photos/${rel}?v=${version(path.join(PHOTO_DIR, rel))}`);
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
