"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowDown, ArrowRight, Flame, Phone } from "lucide-react";
import { fromPrice, money } from "@/lib/menu";
import { StatusPill } from "./StatusPill";
import { Parallax, easeOut } from "./motion";
import type { Locale } from "@/lib/i18n";
import type { MenuProduct, ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";

const rise = (delay: number) => ({ initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, ease: easeOut, delay } });

export function Hero({ t, lang, config, preview, photo, offer }: { t: Messages; lang: Locale; config: ShopConfig; preview: boolean; photo: string | null; offer?: MenuProduct | null }) {
  const tel = `tel:${config.shopPhone.replace(/\s/g, "")}`;
  const ticker = [...t.hero.ticker, ...t.hero.ticker];
  return (
    <section className="oven-glow relative overflow-hidden text-cream">
      <div className="mx-auto grid min-h-[100svh] max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-24 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-8 lg:pb-28">
        <div className="relative z-10">
          {offer && (
            <motion.a {...rise(0)} href="#offers" className="group mb-5 inline-flex max-w-full items-center gap-2 rounded-full bg-brand py-1.5 pe-4 ps-1.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-600" data-testid="hero-offer">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-yolk text-coal"><Flame className="h-4 w-4" /></span>
              <span className="truncate"><span className="font-display tracking-[0.08em]">{offer.offerTag}</span> · {offer.name} · {money(fromPrice(offer))}</span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
            </motion.a>
          )}
          <motion.p {...rise(0.05)} className="font-display text-xs tracking-[0.26em] text-yolk sm:text-sm">{t.hero.eyebrow}</motion.p>
          <motion.h1 {...rise(0.15)} className="mt-5 font-display text-[clamp(3.6rem,13vw,8.75rem)] leading-[0.86] text-cream">
            {t.hero.titleA}
            <span className="block">
              <span className="font-serif text-[0.92em] text-brand">{t.hero.titleB}</span>
            </span>
          </motion.h1>
          <motion.p {...rise(0.28)} className="mt-4 font-display text-[clamp(1.5rem,5vw,2.75rem)] leading-none text-cream-2">{t.hero.titleC}</motion.p>
          <motion.p {...rise(0.38)} className="mt-6 max-w-lg text-[17px] leading-relaxed text-cream-2">{t.hero.subtitle}</motion.p>
          <motion.div {...rise(0.48)} className="mt-8 flex flex-wrap items-center gap-3">
            <a href={offer ? "#offers" : "#picks"} className="group inline-flex h-13 items-center gap-2 rounded-full bg-brand px-7 text-base font-semibold text-white shadow-glow transition-transform hover:bg-brand-600 active:scale-[0.98]">
              {t.hero.order} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </a>
            <a href="#menu" className="inline-flex h-13 items-center gap-2 rounded-full border border-white/20 px-6 text-base font-semibold text-cream hover:border-white/50">
              {t.hero.seeMenu}
            </a>
            <a href={tel} className="inline-flex h-13 items-center gap-2 rounded-full px-4 text-base font-semibold text-cream-2 hover:text-cream">
              <Phone className="h-4 w-4" /> {t.hero.callToOrder}
            </a>
          </motion.div>
          <motion.div {...rise(0.58)} className="mt-8">
            <StatusPill config={config} t={t} lang={lang} preview={preview} tone="dark" />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.94, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1.1, ease: easeOut, delay: 0.25 }} className="relative">
          {/* Red "heat" behind the plate */}
          <div aria-hidden className="absolute -inset-10 rounded-full bg-brand/25 blur-3xl" />
          <Parallax amount={40} className="relative aspect-[4/3] overflow-hidden rounded-[32px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/10 lg:aspect-[5/4]">
            {photo ? (
              <Image src={photo} alt="Oriano Pizza" fill priority quality={85} sizes="(max-width: 1024px) 100vw, 620px" className="scale-[1.12] object-cover" />
            ) : (
              <div className="h-full w-full oven-glow" />
            )}
          </Parallax>
          <div className="absolute -bottom-5 start-6 rounded-2xl bg-cream px-4 py-3 text-coal shadow-lift sm:start-8">
            <p className="font-display text-xs tracking-[0.18em] text-brand-700">{t.hero.sizesTitle}</p>
            <p className="mt-0.5 font-display text-2xl leading-none" dir="ltr">30 cm <span className="text-muted">·</span> 45 cm</p>
          </div>
        </motion.div>
      </div>

      <a href="#picks" className="absolute bottom-16 start-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cream-2 hover:text-cream lg:flex rtl:translate-x-1/2" aria-hidden>
        {t.hero.scroll}
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}><ArrowDown className="h-4 w-4" /></motion.span>
      </a>

      {/* Ticker */}
      <div className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-yolk/30 bg-yolk text-coal" dir="ltr" aria-hidden>
        <div className="flex w-max animate-marquee whitespace-nowrap py-2.5 font-display text-sm tracking-[0.18em] motion-reduce:animate-none">
          {ticker.map((x, i) => (
            <span key={i} className="flex items-center">
              <span className="px-5">{x}</span><span className="text-brand">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
