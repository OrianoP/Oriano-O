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
      <h1 className="font-display text-4xl font-black text-ink">{t.myOrders.title}</h1>
      {orders && orders.length === 0 && <p className="mt-6 text-ink-soft">{t.myOrders.empty}</p>}
      <ul className="mt-6 space-y-3">
        {orders?.map((o) => (
          <li key={o.token}>
            <Link href={`/${lang}/track/${o.token}`} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card hover:shadow-pop transition">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 font-black text-brand">#{o.orderNumber.slice(-3)}</span>
              <span className="flex-1">
                <span className="block font-bold text-ink">{o.orderNumber}</span>
                <span className="block text-sm text-ink-soft">{new Date(o.createdAt).toLocaleString(lang === "ar" ? "ar-LB" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
              </span>
              <span className="font-black text-ink">{money(o.total)}</span>
              <span className="text-brand font-bold">{t.myOrders.view} <span className="inline-block rtl:rotate-180" aria-hidden>→</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
