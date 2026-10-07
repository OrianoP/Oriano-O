"use client";

import { useEffect, useState } from "react";
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
  if (!mounted || !lines.length || open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
      <button
        onClick={() => setOpen(true)}
        className="w-full h-14 rounded-full bg-brand text-white font-black shadow-pop flex items-center justify-between px-5 animate-pop"
      >
        <span className="grid h-8 min-w-8 place-items-center rounded-full bg-white/20 px-2 tabular-nums">{cartCount(lines)}</span>
        <span>{t.cart.viewCart}</span>
        <span className="tabular-nums">{money(cartSubtotal(lines))}</span>
      </button>
    </div>
  );
}
