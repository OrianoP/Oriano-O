"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { addonPrice, cleanDescription, money, unitPrice } from "@/lib/menu";
import { sizeLabel, type Locale } from "@/lib/i18n";
import type { MenuProduct } from "@/lib/types";
import type { Messages } from "@/messages/en";

export function ItemSheet({ product: p, lang, t, canOrder, onClose }: {
  product: MenuProduct; lang: Locale; t: Messages; canOrder: boolean; onClose: () => void;
}) {
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);
  const [sizeId, setSizeId] = useState<number | undefined>(p.sizes[0]?.id);
  const [addonIds, setAddonIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  // Once the photo and title scroll away, a slim title bar keeps the item name in view.
  const [titleBar, setTitleBar] = useState(false);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const title = el.querySelector<HTMLElement>("#item-title");
    const show = !!title && el.scrollTop > title.offsetTop + title.offsetHeight - 68;
    if (show !== titleBar) setTitleBar(show);
  };

  const size = p.sizes.find((s) => s.id === sizeId) || null;
  const each = unitPrice(p, size, addonIds);
  const desc = cleanDescription(p.description);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const toggleAddon = (id: number) => setAddonIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = () => {
    add({
      productId: p.id, sizeId: size?.id, addonIds, notes: notes.trim(),
      name: p.name, sizeName: size?.name,
      addonNames: p.addons.filter((a) => addonIds.includes(a.id)).map((a) => a.name),
      unitPrice: each,
    }, qty);
    onClose();
    setOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="item-title">
      <button className="absolute inset-0 bg-ink/40 animate-fade" onClick={onClose} aria-label={t.item.close} />
      <div className="relative flex max-h-[calc(100dvh-max(1.5rem,env(safe-area-inset-top)))] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl animate-sheet sm:max-h-[92dvh] sm:max-w-lg sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 end-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-surface/95 text-ink shadow-soft hover:bg-paper-2"
          aria-label={t.item.close}
        >
          <X className="h-5 w-5" />
        </button>

        <div
          aria-hidden
          className={`absolute inset-x-0 top-0 z-[5] flex h-[4.25rem] items-center border-b border-line bg-surface/95 ps-5 pe-16 backdrop-blur transition-opacity duration-150 sm:ps-6 ${titleBar ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <p className="truncate text-base font-semibold text-ink">{p.name}</p>
        </div>

        {/* The photo scrolls with the options so it never crowds them out on short phones. */}
        <div onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {p.imageUrl && (
            <div className="relative aspect-[16/10] bg-paper-2 sm:aspect-[3/2]">
              <Image src={p.imageUrl} alt={p.name} fill sizes="(max-width: 640px) 100vw, 512px" className="object-cover" />
            </div>
          )}

          <div className="px-5 pt-5 pb-4 space-y-6 sm:px-6 sm:pt-6">
            <div className={p.imageUrl ? "" : "pe-12"}>
              <h2 id="item-title" className="text-2xl font-semibold text-ink">{p.name}</h2>
              {desc && <p className="mt-1.5 leading-relaxed text-muted">{desc}</p>}
            </div>

            {p.sizes.length > 0 && (
              <fieldset>
                <legend className="mb-2.5 flex w-full items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t.item.size}</span>
                  <span className="text-xs text-muted">{t.item.required}</span>
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {p.sizes.map((s) => (
                    <label
                      key={s.id}
                      className={`cursor-pointer rounded-lg border px-4 py-3 ${sizeId === s.id ? "border-ink bg-paper ring-1 ring-ink" : "border-line hover:border-line-strong"}`}
                    >
                      <input type="radio" name="size" className="sr-only" checked={sizeId === s.id} onChange={() => setSizeId(s.id)} />
                      <span className="block font-medium text-ink">{sizeLabel(s.name, lang)}</span>
                      <span className="block text-sm tabular-nums text-muted">{money(s.price)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {p.addons.length > 0 && (
              <fieldset>
                <legend className="mb-2.5 flex w-full items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t.item.extras}</span>
                  <span className="text-xs text-muted">{t.item.optional}</span>
                </legend>
                <div className="divide-y divide-line rounded-lg border border-line">
                  {p.addons.map((a) => {
                    const price = addonPrice(a, size);
                    const on = addonIds.includes(a.id);
                    return (
                      <label key={a.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-paper">
                        <input type="checkbox" checked={on} onChange={() => toggleAddon(a.id)} className="sr-only" />
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${on ? "border-ink bg-ink text-white" : "border-line-strong"}`} aria-hidden>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="flex-1 text-ink">{a.name}</span>
                        <span className="text-sm tabular-nums text-muted" dir={price === 0 ? undefined : "ltr"}>{price === 0 ? t.item.free : `+${money(price)}`}</span>
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
                className="mt-2 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink placeholder:text-muted/70 outline-none focus:border-ink"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center rounded-md border border-line">
            <button className="grid h-11 w-11 place-items-center text-ink disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="−"><Minus className="h-4 w-4" /></button>
            <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
            <button className="grid h-11 w-11 place-items-center text-ink disabled:opacity-30" onClick={() => setQty((q) => Math.min(20, q + 1))} disabled={qty >= 20} aria-label="+"><Plus className="h-4 w-4" /></button>
          </div>
          <button
            onClick={submit}
            disabled={!canOrder || (p.sizes.length > 0 && !size)}
            className="flex h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-md bg-brand px-4 font-semibold sm:px-5 text-white hover:bg-brand-600 disabled:bg-paper-2 disabled:text-muted"
          >
            <span className="truncate">{canOrder ? t.item.addToOrder : t.menu.unavailable}</span>
            {canOrder && <span className="tabular-nums">{money(each * qty)}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
