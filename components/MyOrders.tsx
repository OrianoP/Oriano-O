"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ReceiptText } from "lucide-react";
import { loadOrders, type SavedOrder } from "@/lib/cart";
import { money } from "@/lib/menu";
import { formatDateTime, type Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";
import { Item, Stagger } from "./motion";

export function MyOrders({ lang, t }: { lang: Locale; t: Messages }) {
  const [orders, setOrders] = useState<SavedOrder[] | null>(null);
  useEffect(() => setOrders(loadOrders()), []);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
      <h1 className="font-display text-[2.6rem] leading-none text-ink sm:text-5xl">{t.myOrders.title}</h1>
      <p className="mt-1 text-sm text-muted">{t.myOrders.subtitle}</p>

      {orders && orders.length === 0 && (
        <div className="mt-10 rounded-3xl border border-line bg-surface p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-paper-2 text-muted"><ReceiptText className="h-7 w-7" /></span>
          <p className="mt-4 font-display text-2xl text-ink">{t.myOrders.empty}</p>
          <p className="mt-1 text-sm text-muted">{t.myOrders.emptyHint}</p>
          <Link href={`/${lang}#menu`} className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 font-semibold text-white hover:bg-brand-600">{t.cart.browse}</Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <Stagger className="mt-6 space-y-3">
          {orders.map((o) => (
            <Item key={o.token} as="li" className="list-none">
              <Link href={`/${lang}/track/${o.token}`} className="group flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 hover:border-line-strong hover:shadow-lift sm:p-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-coal font-display text-2xl text-yolk" dir="ltr">#{o.orderNumber.slice(-3)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink" dir="ltr">{o.orderNumber}</span>
                  <span className="block truncate text-sm text-muted">{formatDateTime(o.createdAt, lang)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className="font-display text-2xl text-ink">{money(o.total)}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">{t.myOrders.view} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" /></span>
                </span>
              </Link>
            </Item>
          ))}
        </Stagger>
      )}
    </div>
  );
}
