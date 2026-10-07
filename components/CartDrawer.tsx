"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount, cartSubtotal, useCart } from "@/lib/cart";
import { money } from "@/lib/menu";
import { sizeLabel, type Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";

export function CartDrawer({ lang, t }: { lang: Locale; t: Messages }) {
  const { lines, open, setOpen, setQuantity } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, setOpen]);

  if (!mounted || !open) return null;
  const subtotal = cartSubtotal(lines);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button className="absolute inset-0 bg-ink/50 animate-fade" onClick={() => setOpen(false)} aria-label={t.item.close} />
      <aside className="relative h-full w-full max-w-md bg-cream shadow-2xl flex flex-col animate-fade">
        <div className="flex items-center justify-between px-5 h-16 border-b border-cream-300">
          <h2 id="cart-title" className="font-display text-2xl font-black text-ink">
            {t.cart.title} <span className="text-brand">({cartCount(lines)})</span>
          </h2>
          <button onClick={() => setOpen(false)} className="h-10 w-10 rounded-full hover:bg-cream-200 text-2xl text-ink" aria-label={t.item.close}>×</button>
        </div>

        {lines.length === 0 ? (
          <div className="flex-1 grid place-items-center px-8 text-center text-ink-soft">
            <div>
              <div className="text-6xl mb-3" aria-hidden>🍕</div>
              <p>{t.cart.empty}</p>
            </div>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-cream-300">
            {lines.map((l) => (
              <li key={l.key} className="py-4 flex gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink">{l.name}</p>
                  {l.sizeName && <p className="text-sm text-ink-soft">{sizeLabel(l.sizeName, lang)}</p>}
                  {l.addonNames.length > 0 && <p className="text-sm text-ink-soft">+ {l.addonNames.join(", ")}</p>}
                  {l.notes && <p className="text-sm italic text-ink-soft">“{l.notes}”</p>}
                  <div className="mt-2 inline-flex items-center rounded-full border border-cream-300 bg-white">
                    <button onClick={() => setQuantity(l.key, l.quantity - 1)} className="h-8 w-8 font-black text-ink" aria-label={l.quantity === 1 ? t.cart.remove : "-"}>
                      {l.quantity === 1 ? "🗑" : "−"}
                    </button>
                    <span className="w-6 text-center text-sm font-black tabular-nums">{l.quantity}</span>
                    <button onClick={() => setQuantity(l.key, l.quantity + 1)} disabled={l.quantity >= 20} className="h-8 w-8 font-black text-ink disabled:opacity-30" aria-label="+">+</button>
                  </div>
                </div>
                <p className="font-black text-ink tabular-nums">{money(l.unitPrice * l.quantity)}</p>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 && (
          <div className="border-t border-cream-300 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="flex justify-between text-lg font-black text-ink">
              <span>{t.cart.subtotal}</span>
              <span className="tabular-nums">{money(subtotal)}</span>
            </div>
            <Link
              href={`/${lang}/checkout`}
              onClick={() => setOpen(false)}
              className="flex h-14 items-center justify-center rounded-full bg-brand text-white text-lg font-black shadow-pop hover:bg-brand-600 active:scale-[0.98] transition"
            >
              {t.cart.checkout} <span className="inline-block ms-2 rtl:rotate-180" aria-hidden>→</span>
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
