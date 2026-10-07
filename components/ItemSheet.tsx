"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FoodArt } from "@/components/FoodArt";
import { useCart } from "@/lib/cart";
import { addonPrice, cleanDescription, money, unitPrice } from "@/lib/menu";
import { sizeLabel, type Locale } from "@/lib/i18n";
import type { MenuProduct } from "@/lib/types";
import type { Messages } from "@/messages/en";

export function ItemSheet({ product: p, labelName, lang, t, canOrder, onClose }: {
  product: MenuProduct; labelName: string; lang: Locale; t: Messages; canOrder: boolean; onClose: () => void;
}) {
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);
  const [sizeId, setSizeId] = useState<number | undefined>(p.sizes[0]?.id);
  const [addonIds, setAddonIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);

  const size = p.sizes.find((s) => s.id === sizeId) || null;
  const each = unitPrice(p, size, addonIds);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const toggleAddon = (id: number) =>
    setAddonIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = () => {
    add({
      productId: p.id,
      sizeId: size?.id,
      addonIds,
      notes: notes.trim(),
      name: p.name,
      sizeName: size?.name,
      addonNames: p.addons.filter((a) => addonIds.includes(a.id)).map((a) => a.name),
      unitPrice: each,
    }, qty);
    onClose();
    setOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="item-title">
      <button className="absolute inset-0 bg-ink/50 animate-fade" onClick={onClose} aria-label={t.item.close} />
      <div className="relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-[2rem] sm:rounded-[2rem] bg-cream shadow-2xl animate-slide-up sm:animate-pop overflow-hidden">
        <div className="relative h-56 shrink-0 bg-gradient-to-b from-brand-100 to-cream grid place-items-center overflow-hidden">
          {p.imageUrl ? (
            <Image src={p.imageUrl} alt={p.name} fill sizes="(max-width: 640px) 100vw, 512px" className="object-cover" />
          ) : (
            <FoodArt product={p} labelName={labelName} className={p.itemType === "pizza" ? "h-72 w-72 translate-y-6" : "h-44 w-44"} />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 end-3 h-10 w-10 rounded-full bg-white/90 text-ink grid place-items-center shadow-card text-xl"
            aria-label={t.item.close}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4 space-y-5">
          <div>
            <h2 id="item-title" className="font-display text-2xl font-black text-ink">{p.name}</h2>
            {cleanDescription(p.description) && <p className="mt-1 text-ink-soft">{cleanDescription(p.description)}</p>}
          </div>

          {p.sizes.length > 0 && (
            <fieldset>
              <legend className="flex w-full items-center justify-between mb-2">
                <span className="font-extrabold text-ink">{t.item.size}</span>
                <span className="text-[11px] font-bold uppercase rounded-full bg-brand-100 text-brand-700 px-2 py-0.5">{t.item.required}</span>
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {p.sizes.map((s) => (
                  <label
                    key={s.id}
                    className={`cursor-pointer rounded-2xl border-2 px-4 py-3 transition ${
                      sizeId === s.id ? "border-brand bg-white shadow-card" : "border-cream-300 bg-white/60 hover:border-brand/40"
                    }`}
                  >
                    <input type="radio" name="size" className="sr-only" checked={sizeId === s.id} onChange={() => setSizeId(s.id)} />
                    <span className="block font-bold text-ink">{sizeLabel(s.name, lang)}</span>
                    <span className="block text-sm font-black text-brand">{money(s.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {p.addons.length > 0 && (
            <fieldset>
              <legend className="flex w-full items-center justify-between mb-2">
                <span className="font-extrabold text-ink">{t.item.extras}</span>
                <span className="text-[11px] font-bold uppercase text-ink-soft">{t.item.optional}</span>
              </legend>
              <div className="rounded-2xl bg-white divide-y divide-cream-200 shadow-card">
                {p.addons.map((a) => {
                  const price = addonPrice(a, size);
                  return (
                    <label key={a.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addonIds.includes(a.id)}
                        onChange={() => toggleAddon(a.id)}
                        className="h-5 w-5 accent-[#ff3300]"
                      />
                      <span className="flex-1 text-ink">{a.name}</span>
                      <span className="text-sm font-bold text-ink-soft">{price === 0 ? t.item.free : `+${money(price)}`}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div>
            <label htmlFor="item-notes" className="font-extrabold text-ink">{t.item.notes}</label>
            <textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 200))}
              rows={2}
              placeholder={t.item.notesPlaceholder}
              className="mt-2 w-full rounded-2xl border-2 border-cream-300 bg-white px-4 py-3 text-ink placeholder:text-ink-soft/60 focus:border-brand outline-none"
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-cream-300 bg-white px-5 py-4 flex items-center gap-3">
          <div className="flex items-center rounded-full border-2 border-cream-300">
            <button className="h-11 w-11 text-xl font-black text-ink disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="-">−</button>
            <span className="w-6 text-center font-black tabular-nums" aria-live="polite">{qty}</span>
            <button className="h-11 w-11 text-xl font-black text-ink disabled:opacity-30" onClick={() => setQty((q) => Math.min(20, q + 1))} disabled={qty >= 20} aria-label="+">+</button>
          </div>
          <button
            onClick={submit}
            disabled={!canOrder || (p.sizes.length > 0 && !size)}
            className="flex-1 h-12 rounded-full bg-brand text-white font-black shadow-pop hover:bg-brand-600 active:scale-[0.98] transition disabled:bg-cream-300 disabled:text-ink-soft disabled:shadow-none"
          >
            {canOrder ? `${t.item.addToOrder} · ${money(each * qty)}` : t.menu.unavailable}
          </button>
        </div>
      </div>
    </div>
  );
}
