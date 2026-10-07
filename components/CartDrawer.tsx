"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash, X } from "lucide-react";
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
      <button className="absolute inset-0 bg-ink/40 animate-fade" onClick={() => setOpen(false)} aria-label={t.item.close} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-2xl animate-fade">
        <div className="flex h-16 items-center justify-between border-b border-line px-6">
          <h2 id="cart-title" className="text-lg font-semibold text-ink">
            {t.cart.title} <span className="font-normal text-muted">({cartCount(lines)})</span>
          </h2>
          <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-md text-ink hover:bg-paper-2" aria-label={t.item.close}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="grid flex-1 place-items-center px-10 text-center">
            <div>
              <ShoppingBag className="mx-auto h-10 w-10 text-line-strong" />
              <p className="mt-3 text-muted">{t.cart.empty}</p>
            </div>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-4 py-5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{l.name}</p>
                  {l.sizeName && <p className="text-sm text-muted">{sizeLabel(l.sizeName, lang)}</p>}
                  {l.addonNames.length > 0 && <p className="text-sm text-muted">+ {l.addonNames.join(", ")}</p>}
                  {l.notes && <p className="text-sm italic text-muted">“{l.notes}”</p>}
                  <div className="mt-3 inline-flex items-center rounded-md border border-line">
                    <button onClick={() => setQuantity(l.key, l.quantity - 1)} className="grid h-8 w-8 place-items-center text-ink" aria-label={l.quantity === 1 ? t.cart.remove : "−"}>
                      {l.quantity === 1 ? <Trash className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
                    <button onClick={() => setQuantity(l.key, l.quantity + 1)} disabled={l.quantity >= 20} className="grid h-8 w-8 place-items-center text-ink disabled:opacity-30" aria-label="+">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="font-medium tabular-nums text-ink">{money(l.unitPrice * l.quantity)}</p>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 && (
          <div className="space-y-4 border-t border-line px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between text-ink">
              <span className="text-muted">{t.cart.subtotal}</span>
              <span className="font-semibold tabular-nums">{money(subtotal)}</span>
            </div>
            <Link
              href={`/${lang}/checkout`}
              onClick={() => setOpen(false)}
              className="flex h-12 items-center justify-center gap-2 rounded-md bg-brand font-semibold text-white hover:bg-brand-600"
            >
              {t.cart.checkout} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
