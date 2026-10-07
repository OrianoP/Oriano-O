"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadOrders, type SavedOrder } from "@/lib/cart";
import { money } from "@/lib/menu";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";

export function MyOrders({ lang, t }: { lang: Locale; t: Messages }) {
  const [orders, setOrders] = useState<SavedOrder[] | null>(null);
  useEffect(() => setOrders(loadOrders()), []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-4xl font-extrabold uppercase text-ink rtl:normal-case">{t.myOrders.title}</h1>
      {orders && orders.length === 0 && <p className="mt-6 text-muted">{t.myOrders.empty}</p>}
      <ul className="mt-6 space-y-3">
        {orders?.map((o) => (
          <li key={o.token}>
            <Link href={`/${lang}/track/${o.token}`} className="flex items-center gap-3 sm:gap-4 rounded-xl border border-line bg-surface p-4 hover:border-line-strong hover:shadow-lift">
              <span className="grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-lg bg-paper-2 text-sm sm:text-base font-semibold tabular-nums text-ink">#{o.orderNumber.slice(-3)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink rtl:text-right" dir="ltr">{o.orderNumber}</span>
                <span className="block truncate text-sm text-muted">{new Date(o.createdAt).toLocaleString(lang === "ar" ? "ar-LB" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
              </span>
              {/* Stacked on phones so the order number keeps its room. */}
              <span className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                <span className="font-semibold tabular-nums text-ink">{money(o.total)}</span>
                <span className="text-sm font-semibold text-brand">{t.myOrders.view} <span className="inline-block rtl:rotate-180" aria-hidden>→</span></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
