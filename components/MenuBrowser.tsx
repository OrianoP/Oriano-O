"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { ItemSheet } from "@/components/ItemSheet";
import { CartBar } from "@/components/CartBar";
import { AddedToast } from "@/components/AddedToast";
import { BestSellers } from "@/components/BestSellers";
import { OfferSpotlight, offerSaving } from "@/components/OfferSpotlight";
import { DealSheet } from "@/components/DealSheet";
import type { PublicDeal } from "@/lib/deals";
import { useCart } from "@/lib/cart";
import { cleanDescription, fromPrice, itemKind, money, slugify } from "@/lib/menu";
import { term, type Locale } from "@/lib/i18n";
import type { Menu, MenuProduct, ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";
import { Photo } from "./Photo";
import { Item, Reveal, Stagger, spring } from "./motion";

type Group = { title?: string; products: MenuProduct[] };
type Section = { id: string; title: string; groups: Group[] };

// Chef's picks when the POS hasn't flagged any product as featured.
// Shown until the owner stars dishes in the POS (Menu → ☆). Old and current names both match.
const DEFAULT_PICKS = ["Pepperoni Overload Ranch", "Hot Pepperoni Goat Cheese", "Hot Honey Pepperoni Goat Cheese", "Truffle Chicken", "La Latina"];

export function MenuBrowser({ menu, config, lang, t }: { menu: Menu; config: ShopConfig; lang: Locale; t: Messages }) {
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<PublicDeal | null>(null);
  const [active, setActive] = useState<string>("");
  const tabsRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ start: false, end: false });
  const reconcile = useCart((s) => s.reconcile);
  const canOrder = config.open;

  // Prices and availability may have changed since the cart was saved — fix it up quietly.
  useEffect(() => { reconcile(menu); }, [menu, reconcile]);

  const picks = useMemo(() => {
    const available = menu.products.filter((p) => !p.soldOut);
    const featured = available.filter((p) => p.isFeatured);
    const list = featured.length ? featured : DEFAULT_PICKS.map((n) => available.find((p) => p.name === n)).filter(Boolean) as MenuProduct[];
    return list.slice(0, 4);
  }, [menu]);
  const offers = useMemo(() => menu.products.filter((p) => p.offerTag && !p.soldOut), [menu]);

  // One section per category; pizzas are grouped by base (Red, White, Vodka…).
  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    for (const c of menu.categories) {
      const items = menu.products.filter((p) => p.categoryId === c.id);
      if (!items.length) continue;
      const labels = menu.labels.filter((l) => l.categoryId === c.id && items.some((p) => p.labelId === l.id));
      const groups: Group[] = labels.length > 1
        ? [
            ...labels.map((l) => ({ title: term(l.name, lang), products: items.filter((p) => p.labelId === l.id) })),
            { products: items.filter((p) => !labels.some((l) => l.id === p.labelId)) },
          ].filter((g) => g.products.length)
        : [{ products: items }];
      out.push({ id: slugify(c.name), title: term(c.name, lang), groups });
    }
    return out;
  }, [menu, lang]);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  useEffect(() => {
    const bar = tabsRef.current;
    const tab = bar?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!bar || !tab || bar.scrollWidth <= bar.clientWidth) return;
    const b = bar.getBoundingClientRect();
    const r = tab.getBoundingClientRect();
    if (r.left >= b.left + 32 && r.right <= b.right - 32) return;
    bar.scrollBy({ left: r.left + r.width / 2 - (b.left + b.width / 2), behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    const bar = tabsRef.current;
    if (!bar) return;
    const update = () => {
      const from = Math.abs(bar.scrollLeft);
      const room = bar.scrollWidth - bar.clientWidth;
      setMore((m) => { const n = { start: from > 2, end: room - from > 2 }; return n.start === m.start && n.end === m.end ? m : n; });
    };
    update();
    bar.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { bar.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [sections]);

  return (
    <>
      <OfferSpotlight offers={offers} deals={menu.deals ?? []} products={menu.products} lang={lang} t={t} canOrder={canOrder} onOpen={setSelected} onOpenDeal={setSelectedDeal} />
      <BestSellers picks={picks} t={t} canOrder={canOrder} onOpen={setSelected} />

      <section id="menu" className="scroll-mt-[calc(4rem+env(safe-area-inset-top))] pt-14 sm:pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="font-display text-sm tracking-[0.2em] text-brand">{t.menu.eyebrow}</p>
            <h2 className="mt-1 font-display text-[2.6rem] leading-[0.95] text-ink sm:text-6xl">{t.menu.title}</h2>
          </Reveal>
        </div>

        {/* Category pills, stuck under the header while you browse */}
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 mt-6 bg-paper/90 backdrop-blur-md">
          <div className="relative mx-auto max-w-7xl">
            <div ref={tabsRef} className="flex gap-2 overflow-x-auto overscroll-x-contain px-4 py-3 no-scrollbar sm:px-6 lg:px-8">
              {(offers.length > 0 || !!menu.deals?.length) && (
                <a href="#offers" className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600" data-testid="tab-offers">{t.offers.tab}</a>
              )}
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} data-tab={s.id} className="relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:text-ink">
                  {active === s.id && <motion.span layoutId="tab-pill" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
                  <span className={`relative transition-colors ${active === s.id ? "text-cream" : ""}`}>{s.title}</span>
                </a>
              ))}
            </div>
            <span aria-hidden className={`pointer-events-none absolute inset-y-0 start-0 w-10 bg-linear-to-r from-paper to-transparent transition-opacity rtl:bg-linear-to-l ${more.start ? "opacity-100" : "opacity-0"}`} />
            <span aria-hidden className={`pointer-events-none absolute inset-y-0 end-0 w-12 bg-linear-to-l from-paper to-transparent transition-opacity rtl:bg-linear-to-r ${more.end ? "opacity-100" : "opacity-0"}`} />
          </div>
          <div className="h-px bg-line" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          {sections.map((s) => (
            <div key={s.id} id={s.id} className="scroll-mt-[calc(8rem+env(safe-area-inset-top))] pt-10 sm:pt-14">
              <Reveal className="flex items-end gap-4">
                <h3 className="font-display text-4xl leading-none text-ink sm:text-5xl">{s.title}</h3>
                <span className="mb-1.5 h-px flex-1 bg-line" />
              </Reveal>
              {s.groups.map((g, gi) => (
                <div key={gi} className="mt-6">
                  {g.title && <h4 className="mb-3 font-serif text-xl text-brand-700">{g.title}</h4>}
                  <Stagger className={g.products.some((p) => p.imageUrl) ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"} gap={0.05}>
                    {g.products.map((p) => (
                      <Item key={p.id} as="li" className="list-none">
                        {p.imageUrl ? <PhotoCard product={p} t={t} canOrder={canOrder} onOpen={() => setSelected(p)} /> : <CompactRow product={p} t={t} canOrder={canOrder} onOpen={() => setSelected(p)} />}
                      </Item>
                    ))}
                  </Stagger>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {selected && <ItemSheet key={selected.id} product={selected} lang={lang} t={t} canOrder={canOrder} onClose={() => setSelected(null)} drinks={menu.products.filter((d) => itemKind(d) === "drink" && !d.soldOut)} />}
        {selectedDeal && <DealSheet key={`d${selectedDeal.id}`} deal={selectedDeal} menu={menu} lang={lang} t={t} canOrder={canOrder} onClose={() => setSelectedDeal(null)} />}
      </AnimatePresence>
      <AddedToast t={t} />
      <CartBar t={t} />
    </>
  );
}

function Price({ p, t }: { p: MenuProduct; t: Messages }) {
  const s = p.offerTag ? offerSaving(p) : null;
  return (
    <span className={`font-semibold tabular-nums ${s ? "text-brand-700" : "text-ink"}`}>
      {p.sizes.length > 1 && <span className="me-1 text-xs font-normal text-muted">{t.menu.from}</span>}
      {money(fromPrice(p))}
      {s && <span className="ms-1.5 text-sm font-normal text-muted line-through">{money(s.was)}</span>}
    </span>
  );
}

function PhotoCard({ product: p, t, canOrder, onOpen }: { product: MenuProduct; t: Messages; canOrder: boolean; onOpen: () => void }) {
  const desc = cleanDescription(p.description);
  return (
    <motion.button
      onClick={onOpen}
      data-testid={`menu-item-${p.id}`}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={spring}
      className={`group flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface text-start shadow-soft hover:shadow-lift ${p.soldOut ? "opacity-70" : ""}`}
    >
      <Photo src={p.imageUrl!} alt={p.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="aspect-[4/3]" imgClassName={`transition-transform duration-700 group-hover:scale-[1.05] ${p.soldOut ? "grayscale" : ""}`} />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="font-display text-[1.7rem] leading-none text-ink">{p.name}</span>
          {p.soldOut ? <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">{t.menu.soldOut}</span>
            : p.offerTag ? <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">🔥 {p.offerTag}</span>
            : p.isFeatured && <span className="shrink-0 rounded-full bg-yolk px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coal">{t.menu.popular}</span>}
        </div>
        {desc && <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{desc}</span>}
        <span className="mt-4 flex items-center justify-between">
          <Price p={p} t={t} />
          {canOrder && !p.soldOut && <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-cream transition-colors group-hover:bg-brand" aria-hidden><Plus className="h-5 w-5" /></span>}
        </span>
      </div>
    </motion.button>
  );
}

function CompactRow({ product: p, t, canOrder, onOpen }: { product: MenuProduct; t: Messages; canOrder: boolean; onOpen: () => void }) {
  const desc = cleanDescription(p.description);
  return (
    <motion.button
      onClick={onOpen}
      data-testid={`menu-item-${p.id}`}
      whileTap={{ scale: 0.985 }}
      className={`group flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start hover:border-line-strong hover:shadow-soft ${p.soldOut ? "opacity-70" : ""}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{p.name}{p.offerTag && !p.soldOut && <span className="ms-2 rounded-full bg-brand px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-white">🔥 {p.offerTag}</span>}{p.soldOut && <span className="ms-2 rounded-full bg-ink px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-cream">{t.menu.soldOut}</span>}</span>
        {desc && <span className="mt-0.5 line-clamp-1 block text-sm text-muted">{desc}</span>}
      </span>
      <Price p={p} t={t} />
      {canOrder && !p.soldOut && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white" aria-hidden><Plus className="h-4 w-4" /></span>}
    </motion.button>
  );
}
