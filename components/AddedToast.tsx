"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useCart } from "@/lib/cart";
import type { Messages } from "@/messages/en";
import { spring } from "./motion";

/** "Added to your order" confirmation that slides in from the top, with a shortcut to the cart. */
export function AddedToast({ t }: { t: Messages }) {
  const last = useCart((s) => s.lastAdded);
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const dismiss = useCart((s) => s.dismissAdded);

  useEffect(() => {
    if (!last) return;
    const id = setTimeout(dismiss, 3200);
    return () => clearTimeout(id);
  }, [last, dismiss]);

  return (
    <AnimatePresence>
      {last && !open && (
        <motion.div
          key={last.at}
          role="status"
          initial={{ y: -24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0, scale: 0.98 }}
          transition={spring}
          className="fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-coal p-2 pe-2 ps-3 text-cream shadow-lift"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-basil-400 text-coal"><Check className="h-5 w-5" strokeWidth={3} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-cream-2">{t.menu.addedTitle}</span>
            <span className="block truncate text-sm font-semibold">{last.quantity > 1 ? `${last.quantity} × ` : ""}{last.name}</span>
          </span>
          <button onClick={() => setOpen(true)} className="h-10 shrink-0 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-600">
            {t.menu.addedAction}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
