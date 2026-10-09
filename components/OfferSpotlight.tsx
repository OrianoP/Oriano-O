"use client";

import { motion } from "motion/react";
import { ArrowRight, Flame } from "lucide-react";
import { cleanDescription, fromPrice, money } from "@/lib/menu";
import { fill } from "@/lib/i18n";
import type { MenuProduct } from "@/lib/types";
import type { Messages } from "@/messages/en";
import { Photo } from "./Photo";
import { Item, Reveal, Stagger, spring } from "./motion";

/** What the offer saves, when the POS set a "was" price above today's price. */
export function offerSaving(p: MenuProduct) {
  const was = p.compareAtPrice ?? 0;
  const now = fromPrice(p);
  return was > now ? { was, now, save: was - now } : null;
}

/** Offers set in the POS, first thing on the menu: big, red, hard to miss. */
export function OfferSpotlight({ offers, t, canOrder, onOpen }: { offers: MenuProduct[]; t: Messages; canOrder: boolean; onOpen: (p: MenuProduct) => void }) {
  if (!offers.length) return null;
  const single = offers.length === 1;
  return (
    <section id="offers" className="scroll-mt-[calc(4rem+env(safe-area-inset-top))] pt-12 sm:pt-16" data-testid="offers">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="flex items-center gap-1.5 font-display text-sm tracking-[0.2em] text-brand"><Flame className="h-4 w-4" /> {t.offers.eyebrow}</p>
          <h2 className="mt-1 font-display text-[2.6rem] leading-[0.95] text-ink sm:text-6xl">{t.offers.title}</h2>
        </Reveal>
      </div>
      <Stagger
        className={single
          ? "mx-auto mt-7 max-w-7xl px-4 sm:px-6 lg:px-8"
          : "mt-7 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 no-scrollbar sm:mx-auto sm:grid sm:max-w-7xl sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-6 sm:snap-none lg:px-8"}
        gap={0.08}
      >
        {offers.map((p) => {
          const s = offerSaving(p);
          return (
            <Item key={p.id} className={single ? "" : "w-[88vw] shrink-0 snap-start sm:w-auto"}>
              <motion.button
                onClick={() => onOpen(p)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.99 }}
                transition={spring}
                className={`group relative grid w-full overflow-hidden rounded-[28px] bg-brand text-start text-white shadow-glow ${single ? "md:grid-cols-[1.15fr_1fr]" : ""}`}
                data-testid="offer-card"
              >
                <div className="relative">
                  {p.imageUrl
                    ? <Photo src={p.imageUrl} alt={p.name} fill quality={85} sizes={single ? "(max-width: 768px) 100vw, 640px" : "(max-width: 640px) 88vw, 50vw"} className={single ? "aspect-[16/10] md:aspect-auto md:h-full md:min-h-[22rem]" : "aspect-[16/10]"} imgClassName="transition-transform duration-700 group-hover:scale-[1.05]" />
                    : <div className="aspect-[16/10] oven-glow md:h-full" />}
                  <span className="absolute start-4 top-4 inline-flex max-w-[80%] items-center gap-1.5 truncate rounded-full bg-yolk px-3.5 py-1.5 font-display text-sm tracking-[0.08em] text-coal shadow-lift">
                    <Flame className="h-4 w-4 shrink-0" /> {p.offerTag}
                  </span>
                </div>
                <div className="relative flex flex-col justify-center gap-3 p-6 sm:p-8">
                  <div aria-hidden className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                  <h3 className="font-display text-4xl leading-[0.95] sm:text-5xl">{p.name}</h3>
                  {cleanDescription(p.description) && <p className="line-clamp-3 text-[15px] leading-relaxed text-white/85">{cleanDescription(p.description)}</p>}
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display text-5xl leading-none tabular-nums">
                      {p.sizes.length > 1 && <span className="me-1.5 align-middle font-sans text-sm font-normal text-white/80">{t.menu.from}</span>}
                      {money(fromPrice(p))}
                    </span>
                    {s && <span className="text-xl tabular-nums text-white/70 line-through decoration-2">{money(s.was)}</span>}
                    {s && <span className="rounded-full bg-coal px-2.5 py-1 text-xs font-bold text-yolk">{fill(t.offers.save, { amount: money(s.save) })}</span>}
                  </div>
                  {canOrder && (
                    <span className="mt-2 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-white px-6 font-semibold text-brand-700 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                      {t.offers.cta} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </span>
                  )}
                </div>
              </motion.button>
            </Item>
          );
        })}
      </Stagger>
    </section>
  );
}
