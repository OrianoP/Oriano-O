"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, Flame, Minus, Plus, X } from "lucide-react";
import { MAX_QTY, dealPickNames, useCart } from "@/lib/cart";
import { dealTotal, pricePicks, type DealPick, type PublicDeal } from "@/lib/deals";
import { money } from "@/lib/menu";
import { fill, sizeLabel, type Locale } from "@/lib/i18n";
import type { Menu, MenuProduct } from "@/lib/types";
import type { Messages } from "@/messages/en";
import { Photo } from "./Photo";
import { DealPicture, dealPriceText } from "./OfferSpotlight";
import { spring } from "./motion";

type Slot = { slotId: string; productId?: number; sizeId?: number };

/**
 * A deal, one tap at a time: each item in the deal is its own screen with the
 * dishes to choose from (photos, two per row). Items with only one choice are
 * filled in already. Ends on a summary with the price, then "Add deal".
 */
export function DealSheet({ deal, menu, lang, t, canOrder, onClose }: {
  deal: PublicDeal; menu: Menu; lang: Locale; t: Messages; canOrder: boolean; onClose: () => void;
}) {
  const add = useCart((s) => s.add);
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const product = (id?: number) => menu.products.find((p) => p.id === id);
  const name = lang === "ar" && deal.nameAr ? deal.nameAr : deal.name;

  // One entry per item; a step with a single choice (and size) is filled in from the start.
  const [picks, setPicks] = useState<Slot[]>(() => deal.slots.flatMap((s) => Array.from({ length: s.quantity }, () => {
    if (s.options.length !== 1) return { slotId: s.id };
    const o = s.options[0];
    return { slotId: s.id, productId: o.productId, sizeId: o.sizeIds.length === 1 ? o.sizeIds[0] : undefined };
  })));
  const fixed = useMemo(() => picks.map((p) => {
    const s = deal.slots.find((x) => x.id === p.slotId)!;
    return s.options.length === 1 && s.options[0].sizeIds.length <= 1;
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const choosable = picks.map((_, i) => i).filter((i) => !fixed[i]);
  const firstOpen = () => choosable.find((i) => !done(picks[i])) ?? -1;
  const done = (p: Slot) => {
    const pr = product(p.productId);
    return !!pr && (!pr.sizes.length || !!p.sizeId);
  };
  const [at, setAt] = useState<number>(() => firstOpen()); // index into picks, -1 = summary
  const [qty, setQty] = useState(1);
  const complete = picks.every(done);

  const priced = complete ? pricePicks(deal, picks as DealPick[], menu) : null;
  const each = priced ? dealTotal(deal, priced) : deal.fromPrice;
  const normal = priced ? priced.reduce((n, p) => n + p.normal, 0) : null;

  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [at]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const advance = (next: Slot[], from: number) => {
    const later = choosable.find((i) => i > from && !done(next[i]));
    const earlier = choosable.find((i) => !done(next[i]));
    setAt(later ?? earlier ?? -1);
  };
  const choose = (i: number, productId: number, sizeId?: number) => {
    const opt = deal.slots.find((s) => s.id === picks[i].slotId)!.options.find((o) => o.productId === productId)!;
    const autoSize = sizeId ?? (opt.sizeIds.length === 1 ? opt.sizeIds[0] : undefined);
    const next = picks.map((p, j) => (j === i ? { ...p, productId, sizeId: autoSize } : p));
    setPicks(next);
    const pr = product(productId)!;
    if (!pr.sizes.length || autoSize) setTimeout(() => advance(next, i), 180);
  };

  const submit = () => {
    if (!priced) return;
    add({
      productId: 0, addonIds: [], notes: "", name, unitPrice: each,
      addonNames: dealPickNames(priced, (s) => sizeLabel(s, lang)),
      imageUrl: deal.imageUrl ?? priced.find((p) => p.product.imageUrl)?.product.imageUrl ?? null,
      deal: { dealId: deal.id, picks: picks.map((p) => ({ slotId: p.slotId, productId: p.productId!, sizeId: p.sizeId ?? null })) },
    }, qty);
    onClose();
  };

  // Labels for the current step: "Pizza 1 of 2".
  const label = (i: number) => {
    const slot = deal.slots.find((s) => s.id === picks[i].slotId)!;
    const sameSlot = picks.map((p, j) => [p, j] as const).filter(([p]) => p.slotId === slot.id).map(([, j]) => j);
    return slot.quantity > 1 ? fill(t.deal.pick, { item: slot.label, i: sameSlot.indexOf(i) + 1, n: slot.quantity }) : fill(t.deal.pickOne, { item: slot.label });
  };
  const stepNo = choosable.indexOf(at) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="deal-title">
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-coal/60 backdrop-blur-[2px]" onClick={onClose} aria-label={t.item.close} />
      <motion.div
        ref={panel}
        initial={{ y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
        transition={{ ...spring, stiffness: 320, damping: 34 }}
        className="relative flex h-[min(92dvh,52rem)] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-2xl sm:h-[min(88dvh,50rem)] sm:max-w-2xl sm:rounded-[28px]"
        data-testid="deal-sheet"
      >
        {/* Header: deal name, progress */}
        <div className="shrink-0 border-b border-line bg-surface">
          <div className="flex items-center gap-2 px-3 pt-3 sm:px-4">
            {at !== -1 && choosable.indexOf(at) > 0 ? (
              <button onClick={() => setAt(choosable[choosable.indexOf(at) - 1])} className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-paper-2" aria-label={t.deal.back}><ArrowLeft className="h-5 w-5 rtl:rotate-180" /></button>
            ) : <span className="w-2" />}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-display text-xs tracking-[0.16em] text-brand"><Flame className="h-3.5 w-3.5" /> {deal.tag || dealPriceText(deal, t)}</p>
              <h2 id="deal-title" className="truncate font-display text-2xl leading-tight text-ink">{name}</h2>
            </div>
            <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-paper-2" aria-label={t.item.close}><X className="h-5 w-5" /></button>
          </div>
          {choosable.length > 0 && (
            <div className="flex gap-1 px-4 pb-3 pt-2 sm:px-5" aria-hidden>
              {choosable.map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${done(picks[i]) ? "bg-brand" : i === at ? "bg-ink" : "bg-line"}`} />)}
            </div>
          )}
        </div>

        <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <AnimatePresence mode="wait" initial={false}>
            {at === -1 ? (
              <motion.div key="review" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }} className="space-y-4 p-4 sm:p-5">
                <DealPicture deal={deal} products={menu.products} className="aspect-[16/8] overflow-hidden rounded-2xl" sizes="(max-width: 640px) 100vw, 640px" />
                {deal.description && <p className="text-[15px] leading-relaxed text-muted">{deal.description}</p>}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink">{t.deal.review}</h3>
                  <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line" data-testid="deal-review">
                    {picks.map((p, i) => {
                      const pr = product(p.productId);
                      const slot = deal.slots.find((s) => s.id === p.slotId)!;
                      const size = pr?.sizes.find((s) => s.id === p.sizeId);
                      return (
                        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                          {pr?.imageUrl ? <Photo src={pr.imageUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" imgClassName="h-full w-full" /> : <span className="h-12 w-12 shrink-0 rounded-xl bg-paper-2" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-ink">{pr?.name}</span>
                            <span className="block text-xs text-muted">{slot.label}{size ? ` · ${sizeLabel(size.name, lang)}` : ""}</span>
                          </span>
                          {slot.free || (deal.priceMode === "free_items" && slot.free) ? <span className="rounded-full bg-basil/15 px-2 py-0.5 text-xs font-bold text-basil">{t.deal.free}</span> : null}
                          {fixed[i] ? <span className="text-xs font-semibold text-muted">{t.deal.included}</span>
                            : <button onClick={() => setAt(i)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink">{t.deal.change}</button>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <motion.div key={at} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }} className="p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{fill(t.deal.step, { n: stepNo, total: choosable.length })}</p>
                <h3 className="mt-0.5 font-display text-3xl leading-none text-ink">{label(at)}</h3>
                <Options deal={deal} slotId={picks[at].slotId} pick={picks[at]} menu={menu} lang={lang} t={t} onChoose={(productId, sizeId) => choose(at, productId, sizeId)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer: price and the button */}
        <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          {at === -1 && (
            <div className="flex items-center rounded-full border border-line" role="group" aria-label={t.item.quantity}>
              <button className="grid h-12 w-11 place-items-center text-ink disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={t.item.decrease}><Minus className="h-4 w-4" /></button>
              <span className="w-5 text-center font-semibold tabular-nums">{qty}</span>
              <button className="grid h-12 w-11 place-items-center text-ink disabled:opacity-30" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} disabled={qty >= MAX_QTY} aria-label={t.item.increase}><Plus className="h-4 w-4" /></button>
            </div>
          )}
          {at === -1 ? (
            <motion.button onClick={submit} whileTap={{ scale: 0.98 }} disabled={!canOrder || !priced}
              className="flex h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-full bg-brand px-5 font-semibold text-white hover:bg-brand-600 disabled:bg-paper-2 disabled:text-muted" data-testid="deal-add">
              <span className="truncate">{canOrder ? t.deal.add : t.menu.unavailable}</span>
              <span className="flex items-baseline gap-2 tabular-nums">
                {normal != null && normal > each && <span className="text-sm font-normal text-white/70 line-through">{money(normal * qty)}</span>}
                {money(each * qty)}
              </span>
            </motion.button>
          ) : (
            <div className="flex h-12 flex-1 items-center justify-between text-sm">
              <span className="text-muted">{t.menu.from} <b className="font-semibold text-ink tabular-nums">{money(deal.fromPrice)}</b></span>
              {complete && <button onClick={() => setAt(-1)} className="h-12 rounded-full bg-ink px-5 font-semibold text-cream">{t.deal.review}</button>}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/** The dishes for one item of the deal, two per row, with a size choice when needed. */
function Options({ deal, slotId, pick, menu, lang, t, onChoose }: {
  deal: PublicDeal; slotId: string; pick: Slot; menu: Menu; lang: Locale; t: Messages; onChoose: (productId: number, sizeId?: number) => void;
}) {
  const slot = deal.slots.find((s) => s.id === slotId)!;
  const showPrice = deal.priceMode !== "fixed" && !slot.free;
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {slot.options.map((o) => {
        const p = menu.products.find((x) => x.id === o.productId) as MenuProduct | undefined;
        if (!p) return null;
        const on = pick.productId === p.id;
        const sizes = p.sizes.filter((s) => o.sizeIds.includes(s.id));
        const price = sizes.length ? Math.min(...sizes.map((s) => s.price)) : p.basePrice;
        return (
          <div key={p.id} className={`relative overflow-hidden rounded-2xl border-2 bg-surface transition-colors ${on ? "border-ink" : "border-line hover:border-line-strong"}`}>
            <button onClick={() => onChoose(p.id)} className="block w-full text-start" data-testid="deal-option">
              {p.imageUrl ? <Photo src={p.imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, 220px" className="aspect-[4/3]" />
                : <div className="aspect-[4/3] bg-paper-2" />}
              <span className="block px-3 pb-2.5 pt-2">
                <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{p.name}</span>
                {slot.free ? <span className="text-xs font-bold text-basil">{t.deal.free}</span>
                  : showPrice ? <span className="text-xs tabular-nums text-muted">{sizes.length > 1 && `${t.menu.from} `}{money(price)}</span> : null}
              </span>
            </button>
            {on && <span className="absolute end-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>}
            {on && sizes.length > 1 && (
              <div className="grid gap-1.5 border-t border-line p-2" role="group" aria-label={t.deal.chooseSize}>
                {sizes.map((s) => (
                  <button key={s.id} onClick={() => onChoose(p.id, s.id)} data-testid="deal-size"
                    className={`flex h-10 items-center justify-between rounded-xl border-2 px-3 text-sm font-semibold ${pick.sizeId === s.id ? "border-ink bg-ink text-cream" : "border-line text-ink hover:border-ink"}`}>
                    <span>{sizeLabel(s.name, lang)}</span>{showPrice && <span className="tabular-nums">{money(s.price)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
