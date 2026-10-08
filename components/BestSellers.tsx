"use client";

import { motion } from "motion/react";
import { ArrowRight, Plus } from "lucide-react";
import { cleanDescription, fromPrice, money } from "@/lib/menu";
import type { MenuProduct } from "@/lib/types";
import type { Messages } from "@/messages/en";
import { Photo } from "./Photo";
import { Item, Reveal, Stagger, spring } from "./motion";

/** The highlight row at the top of the menu: big photo cards, numbered like a countdown. */
export function BestSellers({ picks, t, canOrder, onOpen }: { picks: MenuProduct[]; t: Messages; canOrder: boolean; onOpen: (p: MenuProduct) => void }) {
  if (!picks.length) return null;
  return (
    <section id="picks" className="scroll-mt-[calc(4rem+env(safe-area-inset-top))] pt-12 sm:pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-sm tracking-[0.2em] text-brand">{t.picks.eyebrow}</p>
            <h2 className="mt-1 font-display text-[2.6rem] leading-[0.95] text-ink sm:text-6xl">{t.picks.title}</h2>
            <p className="mt-2 text-muted">{t.picks.subtitle}</p>
          </div>
          <a href="#menu" className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-ink hover:border-ink">
            {t.picks.viewAll} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </a>
        </Reveal>
      </div>

      {/* Phones: snap-scroll rail that bleeds to the edge. Desktop: a 4-up grid. */}
      <Stagger className="mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[11vw] pb-4 no-scrollbar sm:mx-auto sm:gap-4 sm:grid sm:max-w-7xl sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-6 lg:grid-cols-4 lg:px-8" gap={0.08}>
        {picks.map((p, i) => (
          <Item key={p.id} className="w-[78vw] shrink-0 snap-center sm:w-auto">
            <motion.button
              onClick={() => onOpen(p)}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.985 }}
              transition={spring}
              className="group relative block w-full overflow-hidden rounded-3xl bg-coal text-start text-cream shadow-lift"
            >
              {p.imageUrl ? (
                <Photo src={p.imageUrl} alt={p.name} fill sizes="(max-width: 640px) 78vw, (max-width: 1024px) 50vw, 25vw" className="aspect-[4/5]" imgClassName="transition-transform duration-700 group-hover:scale-[1.06]" />
              ) : (
                <div className="aspect-[4/5] oven-glow" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-coal via-coal/40 to-transparent" />
              <span className="absolute start-4 top-4 font-display text-5xl leading-none text-yolk drop-shadow">{String(i + 1).padStart(2, "0")}</span>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="font-display text-3xl leading-none">{p.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-cream-2">{cleanDescription(p.description)}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold tabular-nums">
                    {p.sizes.length > 1 && <span className="me-1 text-xs font-normal text-cream-2">{t.menu.from}</span>}{money(fromPrice(p))}
                  </span>
                  {canOrder && <span className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white transition-transform group-hover:rotate-90"><Plus className="h-5 w-5" /></span>}
                </div>
              </div>
            </motion.button>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}
