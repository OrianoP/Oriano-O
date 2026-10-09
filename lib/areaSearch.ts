/**
 * Forgiving search for Lebanese place names typed in Latin letters:
 * "Junie", "Jouniyeh" and "jounieh" all find Jounieh; "dbaye" finds Dbayeh.
 * Keep identical to the POS's shared/areaSearch.ts.
 */
export function areaKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .replace(/ou/g, "u").replace(/ee/g, "i").replace(/oo/g, "u")
    .replace(/[yj]e?h\b/g, (m) => m[0]).replace(/y/g, "i").replace(/q/g, "k")
    .replace(/(\w)h\b/g, "$1").replace(/(.)\1+/g, "$1")
    .replace(/aie/g, "ae") // "Mikayel" → "Mikael"
    .replace(/\b(el|al|ad|ed|er|ar)\s/g, "")
    .trim();
}

const skel = (k: string) => k.replace(/[aeiou ]/g, "");

export type SearchableArea = { name: string; nameAr?: string | null; aliases?: string | null };

/** 0 = no match; higher is better (name start > word start > anywhere). */
export function areaScore(a: SearchableArea, query: string): number {
  const q = areaKey(query);
  if (!q) return 1;
  let best = 0;
  const fields = [a.name, a.nameAr || "", ...(a.aliases || "").split(",")].map((f) => areaKey(f)).filter(Boolean);
  for (const f of fields) {
    if (f === q) best = Math.max(best, 4);
    else if (f.startsWith(q)) best = Math.max(best, 3);
    else if (f.split(" ").some((w) => w.startsWith(q))) best = Math.max(best, 2);
    else if (f.replace(/ /g, "").includes(q.replace(/ /g, ""))) best = Math.max(best, 1);
    // Vowels typed differently or skipped ("Mkayel", "Dbaye", "Harat Sakhr"): compare the consonants.
    else if (q.length >= 4 && skel(q).length >= 2 && skel(f).startsWith(skel(q))) best = Math.max(best, 1);
  }
  return best;
}

export function searchAreas<T extends SearchableArea>(areas: T[], query: string): T[] {
  return areas.map((a) => ({ a, s: areaScore(a, query) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).map((x) => x.a);
}
