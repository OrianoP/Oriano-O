"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { cartCount, cartSubtotal, useCart } from "@/lib/cart";
import { money } from "@/lib/menu";
import type { Messages } from "@/messages/en";
import { spring } from "./motion";

/** Floating "View order" bar for phones once the cart has something in it. */
export function CartBar({ t }: { t: Messages }) {
  const lines = useCart((s) => s.lines);
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const visible = mounted && lines.length > 0;
  const count = cartCount(lines);

  // Reserve room at the bottom of the page (phones only, see globals.css) so the bar never hides the footer.
  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("has-cartbar");
    return () => document.body.classList.remove("has-cartbar");
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && !open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={spring}
          className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
        >
          <motion.button
            onClick={() => setOpen(true)}
            whileTap={{ scale: 0.98 }}
            className="flex h-13 w-full items-center justify-between rounded-full bg-coal px-2 pe-5 text-cream shadow-lift"
          >
            <span className="flex items-center gap-3">
              <motion.span key={count} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={spring} className="grid h-9 min-w-9 place-items-center rounded-full bg-brand px-2 text-sm font-bold tabular-nums text-white">
                {count}
              </motion.span>
              <span className="flex items-center gap-2 text-sm font-semibold"><ShoppingBag className="h-4 w-4" /> {t.cart.viewCart}</span>
            </span>
            <span className="font-semibold tabular-nums">{money(cartSubtotal(lines))}</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
