"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Banknote, Check, CircleX, Clock, Lock, MessageCircle, Phone, RefreshCw, WifiOff } from "lucide-react";
import { consumeJustPlaced } from "@/lib/cart";
import { money } from "@/lib/menu";
import { fill, formatTime, sizeLabel, type Locale } from "@/lib/i18n";
import type { Stage, TrackedOrder } from "@/lib/types";
import type { Messages } from "@/messages/en";
import { easeOut, spring } from "./motion";

const FINAL: Stage[] = ["completed", "cancelled"];

export function OrderTracker({ token, initial, lang, t }: { token: string; initial: TrackedOrder | null; lang: Locale; t: Messages }) {
  const [order, setOrder] = useState<TrackedOrder | null>(initial);
  const [now, setNow] = useState<number | null>(null);
  const [failures, setFailures] = useState(0);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const [justPlaced, setJustPlaced] = useState(false);
  const stageRef = useRef(order?.stage);
  stageRef.current = order?.stage;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/track/${token}`, { cache: "no-store" });
      if (res.ok) { setOrder(await res.json()); setFailures(0); setLastOk(Date.now()); }
      else if (res.status === 404) { setOrder(null); setFailures(0); }
      else setFailures((n) => n + 1);
    } catch {
      setFailures((n) => n + 1);
    }
  }, [token]);

  // Mounted-only clock (avoids a server/client mismatch) and the "just ordered" greeting.
  useEffect(() => {
    setNow(Date.now());
    setJustPlaced(consumeJustPlaced(token));
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [token]);

  // Poll while the order is in progress (faster while waiting for confirmation); fetch at once when the tab comes back.
  useEffect(() => {
    if (order && FINAL.includes(order.stage)) return;
    const every = !order || failures > 0 ? 5000 : order.stage === "awaiting_confirmation" ? 6000 : 15000;
    const id = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, every);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [order, failures, refresh]);

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-paper-2 text-muted"><WifiOff className="h-7 w-7" /></span>
        <h1 className="mt-5 font-display text-3xl text-ink">{t.track.unreachableTitle}</h1>
        <p className="mt-2 text-muted">{t.track.unreachableHint}</p>
        <button onClick={() => void refresh()} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-cream hover:bg-ink-2"><RefreshCw className="h-4 w-4" /> {t.track.retry}</button>
      </div>
    );
  }

  const delivery = order.orderType === "delivery";
  const steps: Stage[] = delivery
    ? ["awaiting_confirmation", "confirmed", "preparing", "in_oven", "out_for_delivery", "completed"]
    : ["awaiting_confirmation", "confirmed", "preparing", "in_oven", "ready", "completed"];
  // A delivery order that's "ready" is waiting for the driver: show it on the oven step.
  const stepStage: Stage = delivery && order.stage === "ready" ? "in_oven" : order.stage;
  const current = Math.max(0, steps.indexOf(stepStage));
  const cancelled = order.stage === "cancelled";
  const done = order.stage === "completed";
  const live = !FINAL.includes(order.stage);
  const tel = `tel:${order.shopPhone.replace(/\s/g, "")}`;
  const wa = `https://wa.me/${order.whatsapp}?text=${encodeURIComponent(fill(t.track.whatsappText, { order: order.orderNumber }))}`;

  const eta = order.estimatedReadyAt ? new Date(order.estimatedReadyAt) : null;
  const etaMins = eta && now ? Math.max(0, Math.round((eta.getTime() - now) / 60000)) : null;
  const stageLabel = (s: Stage) =>
    s === "ready" ? (delivery ? t.track.readyWaitingDriver : t.track.readyForPickup) : t.track.stages[s] ?? String(s);
  const shortLabel = (s: Stage) => (t.track.short as Record<string, string>)[s] ?? stageLabel(s);
  const progress = cancelled ? 0 : done ? 1 : current / (steps.length - 1);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 sm:px-6">
      <AnimatePresence>
        {justPlaced && (
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-coal px-4 py-3 text-sm font-medium text-cream">
            {order.customerFirstName ? fill(t.thanks.title, { name: order.customerFirstName }) : t.thanks.titleNoName} {t.thanks.subtitle}
          </motion.p>
        )}
      </AnimatePresence>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted" dir="ltr">{t.track.title} {order.orderNumber}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1 key={order.stage} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: easeOut }}
            className={`mt-2 font-display text-[clamp(2.6rem,10vw,4.5rem)] leading-[0.92] ${cancelled ? "text-brand-700" : "text-ink"}`}>
            {stageLabel(order.stage)}
          </motion.h1>
        </AnimatePresence>
        {live && (
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted">
            {failures >= 2 ? (
              <><WifiOff className="h-4 w-4 text-brand-700" /> {fill(t.track.reconnecting, { time: lastOk ? formatTime(new Date(lastOk), lang) : "—" })}</>
            ) : (
              <><span className="h-2 w-2 rounded-full bg-basil-400 animate-pulse-dot" /> {t.track.live}</>
            )}
          </p>
        )}
      </div>

      {/* Progress */}
      {!cancelled && (
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
          <div className="relative h-1.5 overflow-hidden rounded-full bg-paper-3">
            <motion.span initial={false} animate={{ width: `${progress * 100}%` }} transition={{ ...spring, stiffness: 120, damping: 24 }} className="absolute inset-y-0 start-0 rounded-full bg-brand" />
          </div>
          <ol className="mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((s, i) => {
              const isDone = done || i < current;
              const active = !done && i === current;
              return (
                <li key={s} className="flex flex-col items-center gap-1.5 text-center">
                  <motion.span
                    animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={active ? { repeat: Infinity, duration: 1.8, ease: "easeInOut" } : spring}
                    className={`grid h-7 w-7 place-items-center rounded-full border-2 text-[11px] font-bold ${isDone ? "border-ink bg-ink text-cream" : active ? "border-brand bg-brand text-white" : "border-line-strong text-muted"}`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </motion.span>
                  <span className={`text-[11px] leading-tight sm:text-xs ${active ? "font-semibold text-ink" : isDone ? "text-ink-2" : "text-muted"}`}>{shortLabel(s)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Status card */}
      <div className={`rounded-3xl border p-5 sm:p-6 ${cancelled ? "border-brand-100 bg-brand-50" : order.stage === "awaiting_confirmation" ? "border-amber-200 bg-amber-50" : "border-line bg-surface"}`}>
        {order.stage === "awaiting_confirmation" && (
          <div className="flex gap-4"><Clock className="h-6 w-6 shrink-0 text-amber-600" /><p className="text-ink-2">{t.track.awaitingHint}</p></div>
        )}
        {cancelled && (
          <div className="flex gap-4">
            <CircleX className="h-6 w-6 shrink-0 text-brand-700" />
            <div>
              <p className="font-semibold text-brand-700">{order.cancelReason || t.track.cancelledDefault}</p>
              <p className="mt-1 text-sm text-muted">{t.track.cancelledHint}</p>
            </div>
          </div>
        )}
        {!cancelled && order.stage !== "awaiting_confirmation" && (
          <div className="flex flex-wrap items-end justify-between gap-4">
            {eta && !done ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{delivery ? t.track.etaDelivery : t.track.eta}</p>
                <p className="mt-1 font-display text-6xl leading-none text-ink">{formatTime(eta, lang)}</p>
                {etaMins !== null && etaMins > 0 && <p className="mt-1 text-sm text-muted">{fill(t.track.minutes, { n: etaMins })}</p>}
              </div>
            ) : (
              <p className="font-semibold text-ink">{stageLabel(order.stage)}</p>
            )}
            {!done && <p className="flex items-center gap-2 text-sm text-basil"><Lock className="h-4 w-4" /> {t.track.confirmedHint}</p>}
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <a href={tel} className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink font-semibold text-cream hover:bg-ink-2"><Phone className="h-4 w-4" /> {t.track.call}</a>
        <a href={wa} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full border border-line-strong bg-surface font-semibold text-ink hover:border-ink"><MessageCircle className="h-4 w-4" /> {t.track.whatsapp}</a>
      </div>
      {live && <p className="text-center text-sm text-muted">{t.track.noCancel}</p>}

      {/* Summary */}
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-display text-2xl text-ink">{t.track.summary}</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex gap-3 py-3">
              <span className="font-semibold tabular-nums text-ink">{it.quantity}×</span>
              <span className="flex-1 text-ink">
                {it.name}
                {it.size && <span className="text-muted"> · {sizeLabel(it.size, lang)}</span>}
                {it.extras.length > 0 && <span className="block text-xs text-muted">+ {it.extras.join(", ")}</span>}
                {it.notes && <span className="block text-xs italic text-muted">“{it.notes}”</span>}
              </span>
              <span className="tabular-nums text-ink">{money(it.totalPrice)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 space-y-1.5 border-t border-line pt-4 text-sm">
          {order.deliveryFee > 0 && <div className="flex justify-between text-muted"><span>{t.cart.delivery}{order.deliveryArea ? ` · ${order.deliveryArea}` : ""}</span><span className="tabular-nums">{money(order.deliveryFee)}</span></div>}
          <div className="flex items-baseline justify-between"><span className="font-semibold text-ink">{t.cart.total}</span><span className="font-display text-3xl text-ink">{money(order.total)}</span></div>
          <p className="flex items-center gap-2 pt-1 text-xs text-muted">
            <Banknote className="h-3.5 w-3.5" />
            {delivery ? t.checkout.cashDelivery : t.checkout.cashPickup} · {t.track.placedAt} {formatTime(order.createdAt, lang)}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold">
        <Link href={`/${lang}#menu`} className="text-ink underline-offset-4 hover:underline">{t.track.orderAgain}</Link>
        <Link href={`/${lang}/orders`} className="text-muted underline-offset-4 hover:underline">{t.nav.myOrders}</Link>
      </div>
    </div>
  );
}
