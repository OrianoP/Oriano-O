"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { MAX_QTY, cartCount, cartSubtotal, useCart } from "@/lib/cart";
import { money } from "@/lib/menu";
import { sizeLabel, type Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";
import { Photo } from "./Photo";
import { spring } from "./motion";

export function CartDrawer({ lang, t }: { lang: Locale; t: Messages }) {
  const { lines, open, setOpen, setQuantity, notice, setNotice } = useCart();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; opener?.focus?.({ preventScroll: true }); };
  }, [open, setOpen]);

  // The notice is one-off: clear it when the drawer closes.
  useEffect(() => { if (!open && notice) setNotice(null); }, [open, notice, setNotice]);

  const subtotal = cartSubtotal(lines);
  const fromEnd = lang === "ar" ? "-100%" : "100%";

  return (
    <AnimatePresence>
      {mounted && open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-coal/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-label={t.item.close} />
          <motion.aside
            ref={panel}
            initial={{ x: reduce ? 0 : fromEnd, opacity: reduce ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduce ? 0 : fromEnd, opacity: reduce ? 0 : 1 }}
            transition={{ ...spring, stiffness: 320, damping: 34 }}
            className="relative flex h-full w-full max-w-md flex-col bg-paper shadow-2xl"
          >
            <div className="shrink-0 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
              <div className="flex h-16 items-center justify-between ps-5 pe-3 sm:ps-6">
                <h2 id="cart-title" className="font-display text-3xl text-ink">
                  {t.cart.title} <span className="font-sans text-base font-normal normal-case text-muted">({cartCount(lines)})</span>
                </h2>
                <button data-autofocus onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-paper-2" aria-label={t.item.close}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {notice && (
              <p className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-ink">
                {notice === "removed" ? t.cart.removedItems : t.cart.pricesUpdated}
              </p>
            )}

            {lines.length === 0 ? (
              <div className="grid flex-1 place-items-center px-10 text-center">
                <div>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-paper-2 text-muted"><ShoppingBag className="h-7 w-7" /></span>
                  <p className="mt-4 font-display text-2xl text-ink">{t.cart.empty}</p>
                  <p className="mt-1 text-sm text-muted">{t.cart.emptyHint}</p>
                  <button onClick={() => setOpen(false)} className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-cream hover:bg-ink-2">{t.cart.browse}</button>
                </div>
              </div>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
                <AnimatePresence initial={false}>
                  {lines.map((l) => (
                    <motion.li
                      key={l.key}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: lang === "ar" ? -40 : 40, transition: { duration: 0.2 } }}
                      transition={spring}
                      className="mb-3 flex gap-3 rounded-2xl border border-line bg-surface p-3"
                    >
                      {l.imageUrl ? (
                        <Photo src={l.imageUrl} alt="" width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded-xl" imgClassName="h-full w-full" />
                      ) : (
                        <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-xl bg-paper-2 font-display text-2xl text-muted">{l.name.slice(0, 1)}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 font-semibold leading-snug text-ink">{l.name}</p>
                          <p className="shrink-0 font-semibold tabular-nums text-ink">{money(l.unitPrice * l.quantity)}</p>
                        </div>
                        {(l.sizeName || l.addonNames.length > 0) && (
                          <p className="mt-0.5 text-sm text-muted">{[l.sizeName && sizeLabel(l.sizeName, lang), ...l.addonNames.map((a) => `+ ${a}`)].filter(Boolean).join(" · ")}</p>
                        )}
                        {l.notes && <p className="mt-0.5 text-sm italic text-muted">“{l.notes}”</p>}
                        <div className="mt-2.5 inline-flex items-center rounded-full border border-line bg-paper">
                          <button onClick={() => setQuantity(l.key, l.quantity - 1)} className="grid h-10 w-10 place-items-center rounded-s-full text-ink hover:bg-paper-2" aria-label={l.quantity === 1 ? t.cart.remove : t.item.decrease}>
                            {l.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          </button>
                          <span className="w-7 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
                          <button onClick={() => setQuantity(l.key, l.quantity + 1)} disabled={l.quantity >= MAX_QTY} className="grid h-10 w-10 place-items-center rounded-e-full text-ink hover:bg-paper-2 disabled:opacity-30" aria-label={t.item.increase}>
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            {lines.length > 0 && (
              <div className="shrink-0 space-y-3 border-t border-line bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted">{t.cart.subtotal}</span>
                  <span className="font-display text-3xl text-ink">{money(subtotal)}</span>
                </div>
                <p className="text-xs text-muted">{t.cart.deliveryNote}</p>
                <Link
                  href={`/${lang}/checkout`}
                  onClick={() => setOpen(false)}
                  className="flex h-13 items-center justify-center gap-2 rounded-full bg-brand text-base font-semibold text-white shadow-glow hover:bg-brand-600"
                >
                  {t.cart.checkout} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
