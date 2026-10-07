"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cartCount, cartSubtotal, useCart } from "@/lib/cart";
import { money } from "@/lib/menu";
import type { Messages } from "@/messages/en";

/** Sticky "View order" bar for phones once the cart has something in it. */
export function CartBar({ t }: { t: Messages }) {
  const lines = useCart((s) => s.lines);
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const visible = mounted && lines.length > 0;

  // Reserve room at the bottom of the page (phones only, see globals.css) so the bar never hides the footer.
  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("has-cartbar");
    return () => document.body.classList.remove("has-cartbar");
  }, [visible]);

  if (!visible || open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-between rounded-md bg-brand px-4 font-semibold text-white"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          {t.cart.viewCart} · {cartCount(lines)}
        </span>
        <span className="tabular-nums">{money(cartSubtotal(lines))}</span>
      </button>
    </div>
  );
}
