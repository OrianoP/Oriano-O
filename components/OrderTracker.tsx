"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "@/lib/menu";
import { sizeLabel, type Locale } from "@/lib/i18n";
import type { Stage, TrackedOrder } from "@/lib/types";
import type { Messages } from "@/messages/en";

const FINAL: Stage[] = ["completed", "cancelled"];

export function OrderTracker({ token, initial, lang, t }: { token: string; initial: TrackedOrder; lang: Locale; t: Messages }) {
  const [order, setOrder] = useState(initial);
  const [now, setNow] = useState(Date.now());

  // Poll while the order is in progress (faster while waiting for confirmation).
  useEffect(() => {
    if (FINAL.includes(order.stage)) return;
    const every = order.stage === "awaiting_confirmation" ? 6000 : 15000;
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/track/${token}`, { cache: "no-store" });
        if (res.ok) setOrder(await res.json());
      } catch {}
    }, every);
    return () => clearInterval(id);
  }, [token, order.stage]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const steps: Stage[] = order.orderType === "delivery"
    ? ["awaiting_confirmation", "confirmed", "in_oven", "out_for_delivery", "completed"]
    : ["awaiting_confirmation", "confirmed", "in_oven", "ready", "completed"];
  // "preparing" sits between confirmed and in-oven; show it as the oven step.
  const stageForSteps: Stage = order.stage === "preparing" ? "in_oven" : order.stage === "ready" && order.orderType === "delivery" ? "in_oven" : order.stage;
  const current = steps.indexOf(stageForSteps);
  const cancelled = order.stage === "cancelled";
  const tel = `tel:${order.shopPhone.replace(/\s/g, "")}`;
  const wa = `https://wa.me/${order.whatsapp}?text=${encodeURIComponent(`Hi Oriano! About my order ${order.orderNumber}`)}`;

  const eta = order.estimatedReadyAt ? new Date(order.estimatedReadyAt) : null;
  const etaMins = eta ? Math.max(0, Math.round((eta.getTime() - now) / 60000)) : null;
  const time = (d: Date) => d.toLocaleTimeString(lang === "ar" ? "ar-LB" : "en-US", { hour: "numeric", minute: "2-digit" });
  const stageLabel = (s: Stage) => (s === "ready" && order.orderType === "pickup" ? t.track.readyForPickup : t.track.stages[s]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-ink-soft">{t.track.title} #{order.orderNumber.slice(-3)}</p>
        <h1 className={`mt-1 font-display text-4xl sm:text-5xl font-black ${cancelled ? "text-brand-700" : "text-ink"}`}>
          {order.customerFirstName ? `${stageLabel(order.stage)}${order.stage === "completed" ? ` ${order.customerFirstName}` : ""}` : stageLabel(order.stage)}
        </h1>
        {!FINAL.includes(order.stage) && (
          <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-basil">
            <span className="h-2 w-2 rounded-full bg-basil animate-pulse" /> {t.track.live}
          </p>
        )}
      </div>

      {/* Hero card */}
      <div className={`rounded-3xl p-6 text-center shadow-card ${cancelled ? "bg-brand-50 border-2 border-brand-100" : order.stage === "awaiting_confirmation" ? "bg-yolk-100 border-2 border-yolk" : "bg-white"}`}>
        {order.stage === "awaiting_confirmation" && (
          <>
            <div className="text-5xl animate-bounce" aria-hidden>⏳</div>
            <p className="mt-3 font-semibold text-ink">{t.track.awaitingHint}</p>
          </>
        )}
        {cancelled && (
          <>
            <div className="text-5xl" aria-hidden>😔</div>
            <p className="mt-3 font-bold text-brand-700">{order.cancelReason}</p>
            <p className="mt-1 text-sm text-ink-soft">{t.track.cancelledHint}</p>
          </>
        )}
        {!cancelled && order.stage !== "awaiting_confirmation" && (
          <>
            <div className="text-5xl" aria-hidden>{order.stage === "completed" ? "🍕" : order.stage === "out_for_delivery" ? "🛵" : order.stage === "ready" ? "✅" : "🔥"}</div>
            {eta && order.stage !== "completed" && (
              <div className="mt-3">
                <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">{order.orderType === "delivery" ? t.track.etaDelivery : t.track.eta}</p>
                <p className="font-display text-4xl font-black text-brand tabular-nums">{time(eta)}</p>
                {etaMins !== null && etaMins > 0 && <p className="text-sm text-ink-soft">~{etaMins} min</p>}
              </div>
            )}
            {order.stage !== "completed" && <p className="mt-3 text-sm font-semibold text-basil">🔒 {t.track.confirmedHint}</p>}
          </>
        )}
      </div>

      {/* Timeline */}
      {!cancelled && (
        <ol className="rounded-3xl bg-white p-5 shadow-card space-y-0">
          {steps.map((s, i) => {
            const done = i < current || order.stage === "completed";
            const active = i === current && order.stage !== "completed";
            return (
              <li key={s} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${done ? "bg-basil text-white" : active ? "bg-brand text-white ring-4 ring-brand-100" : "bg-cream-200 text-ink-soft"}`}>
                    {done ? "✓" : i + 1}
                  </span>
                  {i < steps.length - 1 && <span className={`w-0.5 flex-1 min-h-6 ${done ? "bg-basil" : "bg-cream-300"}`} />}
                </div>
                <p className={`pb-5 pt-1 font-bold ${active ? "text-ink" : done ? "text-ink-soft" : "text-ink-soft/60"}`}>{stageLabel(s)}</p>
              </li>
            );
          })}
        </ol>
      )}

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <a href={tel} className="flex h-14 items-center justify-center gap-2 rounded-full bg-brand font-black text-white shadow-pop">📞 {t.track.call}</a>
        <a href={wa} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#25d366] font-black text-white shadow-card">💬 {t.track.whatsapp}</a>
      </div>
      {!FINAL.includes(order.stage) && <p className="text-center text-xs text-ink-soft">{t.track.noCancel}</p>}

      {/* Summary */}
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <h2 className="font-display text-xl font-black text-ink mb-3">{t.track.summary}</h2>
        <ul className="divide-y divide-cream-200 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="py-2 flex gap-2">
              <span className="font-black text-brand">{it.quantity}×</span>
              <span className="flex-1 text-ink">
                {it.name}
                {it.size && <span className="text-ink-soft"> · {sizeLabel(it.size, lang)}</span>}
                {it.extras.length > 0 && <span className="block text-xs text-ink-soft">+ {it.extras.join(", ")}</span>}
              </span>
              <span className="font-bold tabular-nums">{money(it.totalPrice)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-cream-200 pt-3 space-y-1 text-sm">
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-ink-soft"><span>{t.cart.delivery}{order.deliveryArea ? ` · ${order.deliveryArea}` : ""}</span><span>{money(order.deliveryFee)}</span></div>
          )}
          <div className="flex justify-between text-lg font-black text-ink"><span>{t.cart.total}</span><span>{money(order.total)}</span></div>
          <p className="text-xs text-ink-soft">
            💵 {order.orderType === "delivery" ? t.checkout.cashDelivery : t.checkout.cashPickup} · {t.track.placedAt} {time(new Date(order.createdAt))}
          </p>
        </div>
      </section>

      <div className="text-center">
        <Link href={`/${lang}#menu`} className="inline-flex h-12 items-center rounded-full bg-white px-6 font-bold text-ink shadow-card hover:shadow-pop transition">
          {t.track.orderAgain}
        </Link>
      </div>
    </div>
  );
}
