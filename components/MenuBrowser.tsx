"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { ItemSheet } from "@/components/ItemSheet";
import { CartBar } from "@/components/CartBar";
import { cleanDescription, fromPrice, money, slugify } from "@/lib/menu";
import { term, type Locale } from "@/lib/i18n";
import type { Menu, MenuProduct, ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";

type Group = { title?: string; products: MenuProduct[] };
type Section = { id: string; title: string; groups: Group[] };

export function MenuBrowser({ menu, config, lang, t }: { menu: Menu; config: ShopConfig; lang: Locale; t: Messages }) {
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const [active, setActive] = useState<string>("");
  const tabsRef = useRef<HTMLDivElement>(null);
  const canOrder = config.open;

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

  // Highlight the tab of the section in view.
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-130px 0px -60% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <section id="menu" className="scroll-mt-16">
      <div className="sticky top-16 z-30 bg-paper/95 backdrop-blur border-b border-line">
        <div ref={tabsRef} className="mx-auto max-w-6xl px-4 sm:px-6 flex gap-6 overflow-x-auto no-scrollbar">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-tab={s.id}
              className={`shrink-0 border-b-2 py-3.5 text-sm font-semibold uppercase tracking-wider ${
                active === s.id ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {s.title}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-28">
        {sections.map((s) => (
          <div key={s.id} id={s.id} className="scroll-mt-32 pt-12">
            <h2 className="font-display text-4xl font-extrabold uppercase text-ink rtl:normal-case">{s.title}</h2>
            {s.groups.map((g, gi) => (
              <div key={gi} className="mt-6">
                {g.title && (
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{g.title}</h3>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <ul className="grid gap-3 md:grid-cols-2">
                  {g.products.map((p) => (
                    <li key={p.id}>
                      <ProductRow product={p} t={t} canOrder={canOrder} onOpen={() => setSelected(p)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>

      {selected && <ItemSheet product={selected} lang={lang} t={t} canOrder={canOrder} onClose={() => setSelected(null)} />}
      <CartBar t={t} />
    </section>
  );
}

function ProductRow({ product: p, t, canOrder, onOpen }: { product: MenuProduct; t: Messages; canOrder: boolean; onOpen: () => void }) {
  const desc = cleanDescription(p.description);
  return (
    <button
      onClick={onOpen}
      className="group flex w-full items-stretch gap-4 rounded-xl border border-line bg-surface p-4 text-start hover:border-line-strong hover:shadow-lift"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <h4 className="text-[17px] font-semibold leading-snug text-ink">{p.name}</h4>
          {p.isFeatured && <span className="rounded-sm bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">{t.menu.popular}</span>}
        </div>
        {desc && <p className="mt-1 text-sm leading-relaxed text-muted line-clamp-2">{desc}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-semibold tabular-nums text-ink">
            {p.sizes.length > 1 && <span className="me-1 text-xs font-normal text-muted">{t.menu.from}</span>}
            {money(fromPrice(p))}
          </span>
          {canOrder && (
            <span className="grid h-8 w-8 place-items-center rounded-full border border-line-strong text-ink group-hover:border-brand group-hover:bg-brand group-hover:text-white" aria-hidden>
              <Plus className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
      {p.imageUrl && (
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-paper-2">
          <Image src={p.imageUrl} alt={p.name} fill sizes="112px" className="object-cover" />
        </div>
      )}
    </button>
  );
}
