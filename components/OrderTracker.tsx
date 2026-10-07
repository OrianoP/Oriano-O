"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Banknote, Check, CircleX, Clock, Lock, MessageCircle, Phone, Receipt } from "lucide-react";
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
  const live = !FINAL.includes(order.stage);
  const tel = `tel:${order.shopPhone.replace(/\s/g, "")}`;
  const wa = `https://wa.me/${order.whatsapp}?text=${encodeURIComponent(`Hi Oriano! About my order ${order.orderNumber}`)}`;

  const eta = order.estimatedReadyAt ? new Date(order.estimatedReadyAt) : null;
  const etaMins = eta ? Math.max(0, Math.round((eta.getTime() - now) / 60000)) : null;
  const time = (d: Date) => d.toLocaleTimeString(lang === "ar" ? "ar-LB" : "en-US", { hour: "numeric", minute: "2-digit" });
  const stageLabel = (s: Stage) => (s === "ready" && order.orderType === "pickup" ? t.track.readyForPickup : t.track.stages[s]);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-10 space-y-5 sm:space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t.track.title} {order.orderNumber}</p>
        <h1 className={`mt-2 font-display text-4xl sm:text-5xl font-extrabold uppercase rtl:normal-case ${cancelled ? "text-brand-700" : "text-ink"}`}>
          {stageLabel(order.stage)}
        </h1>
        {live && (
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 rounded-full bg-basil shadow-[0_0_0_4px_rgb(31_122_58_/_0.15)]" /> {t.track.live}
          </p>
        )}
      </div>

      {/* Status card */}
      <div className={`rounded-xl border p-5 sm:p-6 ${cancelled ? "border-brand-100 bg-brand-50" : order.stage === "awaiting_confirmation" ? "border-amber-200 bg-amber-50" : "border-line bg-surface"}`}>
        {order.stage === "awaiting_confirmation" && (
          <div className="flex gap-4">
            <Clock className="h-6 w-6 shrink-0 text-amber-600" />
            <p className="text-ink-2">{t.track.awaitingHint}</p>
          </div>
        )}
        {cancelled && (
          <div className="flex gap-4">
            <CircleX className="h-6 w-6 shrink-0 text-brand-700" />
            <div>
              <p className="font-semibold text-brand-700">{order.cancelReason}</p>
              <p className="mt-1 text-sm text-muted">{t.track.cancelledHint}</p>
            </div>
          </div>
        )}
        {!cancelled && order.stage !== "awaiting_confirmation" && (
          <div className="flex flex-wrap items-end justify-between gap-4">
            {eta && order.stage !== "completed" ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{order.orderType === "delivery" ? t.track.etaDelivery : t.track.eta}</p>
                <p className="mt-1 font-display text-4xl sm:text-5xl font-extrabold tabular-nums text-ink">{time(eta)}</p>
                {etaMins !== null && etaMins > 0 && <p className="text-sm text-muted">~{etaMins} min</p>}
              </div>
            ) : (
              <p className="font-semibold text-ink">{stageLabel(order.stage)}</p>
            )}
            {order.stage !== "completed" && (
              <p className="flex items-center gap-2 text-sm text-basil"><Lock className="h-4 w-4" /> {t.track.confirmedHint}</p>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      {!cancelled && (
        <ol className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          {steps.map((s, i) => {
            const done = i < current || order.stage === "completed";
            const active = i === current && order.stage !== "completed";
            return (
              <li key={s} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold ${
                    done ? "border-ink bg-ink text-white" : active ? "border-brand bg-brand text-white" : "border-line-strong text-muted"
                  }`}>
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  {i < steps.length - 1 && <span className={`w-px flex-1 min-h-6 ${done ? "bg-ink" : "bg-line"}`} />}
                </div>
                <p className={`pb-5 pt-0.5 ${active ? "font-semibold text-ink" : done ? "text-ink-2" : "text-muted"}`}>{stageLabel(s)}</p>
              </li>
            );
          })}
        </ol>
      )}

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <a href={tel} className="flex h-12 items-center justify-center gap-2 rounded-md bg-ink font-semibold text-white hover:bg-ink-2">
          <Phone className="h-4 w-4" /> {t.track.call}
        </a>
        <a href={wa} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-md border border-line-strong bg-surface font-semibold text-ink hover:border-ink">
          <MessageCircle className="h-4 w-4" /> {t.track.whatsapp}
        </a>
      </div>
      {live && <p className="text-center text-sm text-muted">{t.track.noCancel}</p>}

      {/* Summary */}
      <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{t.track.summary}</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex gap-3 py-3">
              <span className="font-semibold tabular-nums text-ink">{it.quantity}×</span>
              <span className="min-w-0 flex-1 break-words text-ink">
                {it.name}
                {it.size && <span className="text-muted"> · {sizeLabel(it.size, lang)}</span>}
                {it.extras.length > 0 && <span className="block text-xs text-muted">+ {it.extras.join(", ")}</span>}
              </span>
              <span className="tabular-nums text-ink">{money(it.totalPrice)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 space-y-1.5 border-t border-line pt-4 text-sm">
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-muted"><span>{t.cart.delivery}{order.deliveryArea ? ` · ${order.deliveryArea}` : ""}</span><span className="tabular-nums">{money(order.deliveryFee)}</span></div>
          )}
          <div className="flex justify-between text-base font-semibold text-ink"><span>{t.cart.total}</span><span className="tabular-nums">{money(order.total)}</span></div>
          <p className="flex items-center gap-2 pt-1 text-xs text-muted">
            <Banknote className="h-3.5 w-3.5" />
            {order.orderType === "delivery" ? t.checkout.cashDelivery : t.checkout.cashPickup} · {t.track.placedAt} {time(new Date(order.createdAt))}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-x-2">
        <Link href={`/${lang}#menu`} className="inline-flex h-11 items-center rounded-md px-4 font-semibold text-ink underline-offset-4 hover:underline">
          {t.track.orderAgain}
        </Link>
        <span className="h-4 w-px bg-line-strong" aria-hidden />
        <Link href={`/${lang}/orders`} className="inline-flex h-11 items-center gap-2 rounded-md px-4 font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          <Receipt className="h-4 w-4 text-muted" /> {t.nav.myOrders}
        </Link>
      </div>
    </div>
  );
}
