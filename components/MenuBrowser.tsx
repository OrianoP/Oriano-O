"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { FoodArt } from "@/components/FoodArt";
import { ItemSheet } from "@/components/ItemSheet";
import { CartBar } from "@/components/CartBar";
import { cleanDescription, fromPrice, money, slugify } from "@/lib/menu";
import { term, type Locale } from "@/lib/i18n";
import type { Menu, MenuProduct, ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";

type Section = { id: string; title: string; subtitle?: string; products: MenuProduct[]; labelName?: string };

export function MenuBrowser({ menu, config, lang, t }: { menu: Menu; config: ShopConfig; lang: Locale; t: Messages }) {
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const [active, setActive] = useState<string>("");
  const tabsRef = useRef<HTMLDivElement>(null);
  const canOrder = config.open;

  const labelName = (id: number | null) => menu.labels.find((l) => l.id === id)?.name || "";

  // Category → (label groups). Pizzas are grouped by base (Red, White, Vodka…).
  const { tabs, sections } = useMemo(() => {
    const tabs: { id: string; title: string }[] = [];
    const sections: Section[] = [];
    for (const c of menu.categories) {
      const items = menu.products.filter((p) => p.categoryId === c.id);
      if (!items.length) continue;
      const catId = slugify(c.name);
      tabs.push({ id: catId, title: term(c.name, lang) });
      const labels = menu.labels.filter((l) => l.categoryId === c.id && items.some((p) => p.labelId === l.id));
      if (labels.length && c.name.toLowerCase() === "pizza") {
        labels.forEach((l, i) => {
          sections.push({
            id: i === 0 ? catId : `${catId}-${slugify(l.name)}`,
            title: i === 0 ? term(c.name, lang) : "",
            subtitle: term(l.name, lang),
            labelName: l.name,
            products: items.filter((p) => p.labelId === l.id),
          });
        });
        const rest = items.filter((p) => !labels.some((l) => l.id === p.labelId));
        if (rest.length) sections.push({ id: `${catId}-more`, title: "", products: rest });
      } else {
        sections.push({ id: catId, title: term(c.name, lang), products: items });
      }
    }
    return { tabs, sections };
  }, [menu, lang]);

  // Highlight the tab of the section in view.
  useEffect(() => {
    const ids = tabs.map((t) => t.id);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [tabs]);

  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <section id="menu" className="scroll-mt-20">
      <div className="sticky top-16 z-30 bg-cream/95 backdrop-blur border-b border-cream-300/70">
        <div ref={tabsRef} className="mx-auto max-w-6xl px-4 flex gap-2 overflow-x-auto no-scrollbar py-3">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              data-tab={tab.id}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                active === tab.id ? "bg-brand text-white shadow-pop" : "bg-white text-ink-soft hover:text-ink shadow-card"
              }`}
            >
              {tab.title}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-28">
        {sections.map((s) => (
          <div key={s.id} id={s.id} className="scroll-mt-32 pt-8">
            {s.title && <h2 className="font-display text-3xl sm:text-4xl font-black text-ink mb-1">{s.title}</h2>}
            {s.subtitle && (
              <h3 className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-brand mb-4 mt-2">
                <span className="h-2 w-2 rounded-full bg-brand" /> {s.subtitle}
              </h3>
            )}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.products.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} labelName={labelName(p.labelId)} t={t} canOrder={canOrder} onOpen={() => setSelected(p)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {selected && (
        <ItemSheet
          product={selected}
          labelName={labelName(selected.labelId)}
          lang={lang}
          t={t}
          canOrder={canOrder}
          onClose={() => setSelected(null)}
        />
      )}
      <CartBar t={t} />
    </section>
  );
}

function ProductCard({ product: p, labelName, t, canOrder, onOpen }: {
  product: MenuProduct; labelName: string; t: Messages; canOrder: boolean; onOpen: () => void;
}) {
  const desc = cleanDescription(p.description);
  const isPizza = p.itemType === "pizza";
  return (
    <button
      onClick={onOpen}
      className="group w-full text-start flex gap-4 rounded-3xl bg-white p-3 pe-4 shadow-card hover:shadow-pop hover:-translate-y-0.5 transition duration-200"
    >
      <div className={`relative shrink-0 ${isPizza ? "h-28 w-28" : "h-24 w-24"} rounded-2xl bg-cream-200 overflow-hidden grid place-items-center`}>
        {p.imageUrl ? (
          <Image src={p.imageUrl} alt={p.name} fill sizes="112px" className="object-cover" />
        ) : (
          <FoodArt product={p} labelName={labelName} className={`${isPizza ? "h-[118%] w-[118%] group-hover:rotate-12" : "h-[88%] w-[88%] group-hover:-rotate-3"} transition-transform duration-500`} />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col py-1">
        <div className="flex items-start gap-2">
          <h4 className="font-display text-lg font-extrabold leading-tight text-ink">{p.name}</h4>
          {p.isFeatured && <span className="shrink-0 rounded-full bg-yolk px-2 py-0.5 text-[10px] font-black uppercase text-ink">{t.menu.popular}</span>}
        </div>
        {desc && <p className="mt-1 text-sm text-ink-soft line-clamp-2">{desc}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-black text-ink">
            {p.sizes.length > 1 && <span className="text-xs font-semibold text-ink-soft me-1">{t.menu.from}</span>}
            {money(fromPrice(p))}
          </span>
          <span
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-black transition ${
              canOrder ? "bg-brand text-white group-hover:bg-brand-600" : "bg-cream-200 text-ink-soft"
            }`}
            aria-hidden
          >
            {canOrder ? "+" : "·"}
          </span>
        </div>
      </div>
    </button>
  );
}
