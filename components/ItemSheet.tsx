"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Minus, Plus, X } from "lucide-react";
import { MAX_QTY, useCart } from "@/lib/cart";
import { addonPrice, cleanDescription, isXl, money, unitPrice } from "@/lib/menu";
import { sizeLabel, type Locale } from "@/lib/i18n";
import type { MenuProduct } from "@/lib/types";
import type { Messages } from "@/messages/en";
import { Photo } from "./Photo";
import { spring } from "./motion";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ItemSheet({ product: p, lang, t, canOrder, onClose }: {
  product: MenuProduct; lang: Locale; t: Messages; canOrder: boolean; onClose: () => void;
}) {
  const add = useCart((s) => s.add);
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const [sizeId, setSizeId] = useState<number | undefined>((p.sizes.find((s) => !s.soldOut) ?? p.sizes[0])?.id);
  const [addonIds, setAddonIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  const [titleBar, setTitleBar] = useState(false);

  const size = p.sizes.find((s) => s.id === sizeId) || null;
  const each = unitPrice(p, size, addonIds);
  const desc = cleanDescription(p.description);

  // Dialog behaviour: lock the page, trap Tab, Escape closes, focus returns to the opener.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]");
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; opener?.focus?.({ preventScroll: true }); };
  }, [onClose]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const title = el.querySelector<HTMLElement>("#item-title");
    const show = !!title && el.scrollTop > title.offsetTop + title.offsetHeight - 64;
    if (show !== titleBar) setTitleBar(show);
  };

  const toggleAddon = (id: number) => setAddonIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = () => {
    add({
      productId: p.id, sizeId: size?.id, addonIds, notes: notes.trim(),
      name: p.name, sizeName: size?.name,
      addonNames: p.addons.filter((a) => addonIds.includes(a.id)).map((a) => a.name),
      unitPrice: each, imageUrl: p.imageUrl,
    }, qty);
    onClose();
  };

  const sizeHint = (name: string) => (isXl({ name }) ? t.item.xlHint : /regular|30/i.test(name) ? t.item.regularHint : null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="item-title">
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-coal/60 backdrop-blur-[2px]" onClick={onClose} aria-label={t.item.close}
      />
      <motion.div
        ref={panel}
        initial={{ y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
        transition={{ ...spring, stiffness: 320, damping: 34 }}
        drag={reduce ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 800) onClose(); }}
        className="relative flex max-h-[calc(100dvh-max(1.5rem,env(safe-area-inset-top)))] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-2xl sm:max-h-[90dvh] sm:max-w-xl sm:rounded-[28px]"
      >
        {/* Drag handle on phones */}
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center pt-2.5 sm:hidden" aria-hidden><span className="h-1.5 w-10 rounded-full bg-white/70 shadow" /></div>

        <button
          onClick={onClose}
          data-autofocus
          className="absolute end-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-surface/95 text-ink shadow-soft hover:bg-paper-2"
          aria-label={t.item.close}
        >
          <X className="h-5 w-5" />
        </button>

        <div aria-hidden className={`absolute inset-x-0 top-0 z-10 flex h-16 items-center border-b border-line bg-surface/95 ps-5 pe-16 backdrop-blur transition-opacity duration-150 sm:ps-6 ${titleBar ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <p className="truncate text-base font-semibold text-ink">{p.name}</p>
        </div>

        <div onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {p.imageUrl ? (
            <div className="relative">
              <Photo src={p.imageUrl} alt={p.name} fill sizes="(max-width: 640px) 100vw, 576px" className="aspect-[16/10] sm:aspect-[3/2]" priority />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-surface to-transparent" />
            </div>
          ) : (
            <div className="h-6" />
          )}

          <div className="space-y-7 px-5 pb-5 sm:px-7">
            {/* relative: paints above the photo's gradient even when the Arabic font sits taller */}
            <div className={`relative ${p.imageUrl ? "-mt-2 rtl:mt-1" : "pe-12 pt-6"}`}>
              <h2 id="item-title" className="font-display text-4xl leading-none text-ink sm:text-5xl">{p.name}</h2>
              {desc && <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{desc}</p>}
            </div>

            {p.sizes.length > 0 && (
              <fieldset>
                <legend className="mb-3 flex w-full items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t.item.size}</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">{t.item.required}</span>
                </legend>
                <div className="grid grid-cols-2 gap-2.5">
                  {p.sizes.map((s) => {
                    const on = sizeId === s.id;
                    const hint = s.soldOut ? t.menu.soldOut : sizeHint(s.name);
                    return (
                      <label key={s.id} className={`relative rounded-2xl border-2 px-4 py-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${s.soldOut ? "cursor-not-allowed border-line opacity-50" : on ? "cursor-pointer border-ink bg-paper" : "cursor-pointer border-line hover:border-line-strong"}`}>
                        <input type="radio" name="size" className="sr-only" checked={on} disabled={!!s.soldOut} onChange={() => setSizeId(s.id)} />
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-ink">{sizeLabel(s.name, lang)}</span>
                          <span className="text-sm font-semibold tabular-nums text-ink">{money(s.price)}</span>
                        </span>
                        {hint && <span className={`mt-1 block text-xs ${s.soldOut ? "font-semibold text-brand-700" : "text-muted"}`}>{hint}</span>}
                        {on && <motion.span layoutId="size-check" transition={spring} className="absolute -end-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></motion.span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {p.addons.length > 0 && (
              <fieldset>
                <legend className="mb-3 flex w-full items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t.item.extras}</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">{t.item.optional}</span>
                </legend>
                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  {p.addons.map((a) => {
                    const price = addonPrice(a, size);
                    const on = addonIds.includes(a.id);
                    return (
                      <label key={a.id} className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors has-[:focus-visible]:bg-paper-2 ${on ? "bg-paper" : "hover:bg-paper"}`}>
                        <input type="checkbox" checked={on} onChange={() => toggleAddon(a.id)} className="sr-only" />
                        <span className={`grid h-5.5 w-5.5 shrink-0 place-items-center rounded-md border-2 transition-colors ${on ? "border-ink bg-ink text-white" : "border-line-strong"}`} aria-hidden>
                          {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                        <span className="flex-1 text-[15px] text-ink">{a.name}</span>
                        <span className={`text-sm tabular-nums ${price === 0 ? "font-medium text-basil" : "text-muted"}`} dir={price === 0 ? undefined : "ltr"}>{price === 0 ? t.item.free : `+${money(price)}`}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div>
              <label htmlFor="item-notes" className="text-sm font-semibold text-ink">{t.item.notes}</label>
              <textarea
                id="item-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                rows={2}
                placeholder={t.item.notesPlaceholder}
                className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none placeholder:text-muted/60 focus:border-ink"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
          <div className="flex items-center rounded-full border border-line" role="group" aria-label={t.item.quantity}>
            <button className="grid h-12 w-12 place-items-center text-ink disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={t.item.decrease}><Minus className="h-4 w-4" /></button>
            <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
            <button className="grid h-12 w-12 place-items-center text-ink disabled:opacity-30" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} disabled={qty >= MAX_QTY} aria-label={t.item.increase}><Plus className="h-4 w-4" /></button>
          </div>
          <motion.button
            onClick={submit}
            whileTap={{ scale: 0.98 }}
            disabled={!canOrder || p.soldOut || (p.sizes.length > 0 && (!size || size.soldOut))}
            className="flex h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-full bg-brand px-5 font-semibold text-white hover:bg-brand-600 disabled:bg-paper-2 disabled:text-muted"
          >
            <span className="truncate">{p.soldOut ? t.menu.soldOut : canOrder ? t.item.addToOrder : t.menu.unavailable}</span>
            {canOrder && !p.soldOut && (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={each * qty} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.18 }} className="tabular-nums">
                  {money(each * qty)}
                </motion.span>
              </AnimatePresence>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
