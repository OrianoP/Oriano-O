"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Banknote, Bike, Check, Info, ShoppingBag, Store } from "lucide-react";
import { cartSubtotal, loadProfile, markJustPlaced, reconcileLines, saveOrder, saveProfile, useCart } from "@/lib/cart";
import { money } from "@/lib/menu";
import { lebaneseMobileNational } from "@/lib/phone";
import { fill, sizeLabel, type Locale } from "@/lib/i18n";
import type { Menu, ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";
import { Photo } from "./Photo";
import { easeOut, spring } from "./motion";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Placed = { orderNumber: string; token: string; name: string };

const field = "w-full h-12 rounded-xl border bg-surface px-4 text-ink placeholder:text-muted/60 focus:border-ink outline-none";
const label = "block text-sm font-medium text-ink-2 mb-1.5";
const card = "rounded-3xl border border-line bg-surface p-5 sm:p-7";

function Step({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink font-display text-lg text-cream">{n}</span>
      <div>
        <h2 className="font-display text-3xl leading-none text-ink">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function CheckoutForm({ menu, config: initialConfig, lang, t, preview }: { menu: Menu; config: ShopConfig; lang: Locale; t: Messages; preview: boolean }) {
  const router = useRouter();
  const storeLines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const [config, setConfig] = useState(initialConfig);
  const [mounted, setMounted] = useState(false);
  const openedAt = useRef(Date.now());
  const turnstileWidget = useRef<string | null>(null);

  // Reconcile once against the live menu and write it back, so every count on the page agrees.
  const reconciled = useMemo(() => reconcileLines(storeLines, menu), [storeLines, menu]);
  const lines = reconciled.lines;
  const [notice, setNotice] = useState<"removed" | "repriced" | null>(null);
  useEffect(() => {
    if (reconciled.removed || reconciled.repriced) {
      setNotice(reconciled.removed ? "removed" : "repriced");
      useCart.setState({ lines: reconciled.lines });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  const canPickup = config.pickupEnabled;
  const canDeliver = config.deliveryEnabled && config.zones.length > 0;
  const [orderType, setOrderType] = useState<"pickup" | "delivery">(canDeliver && !canPickup ? "delivery" : "pickup");
  const [form, setForm] = useState({ name: "", phone: "", zoneId: "", street: "", building: "", floor: "", landmark: "", notes: "", coupon: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>();

  useEffect(() => {
    setMounted(true);
    const p = loadProfile();
    setForm((f) => ({
      ...f,
      name: p.name || "", phone: p.phone || "", zoneId: p.zoneId ? String(p.zoneId) : "",
      street: p.street || "", building: p.building || "", floor: p.floor || "", landmark: p.landmark || "",
    }));
  }, []);

  // The shop can close or pause while someone is filling the form.
  useEffect(() => {
    const tick = async () => {
      try { const r = await fetch("/api/config", { cache: "no-store" }); if (r.ok) setConfig(await r.json()); } catch {}
    };
    const id = setInterval(tick, 45_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (orderType === "pickup" && !canPickup && canDeliver) setOrderType("delivery");
    if (orderType === "delivery" && !canDeliver && canPickup) setOrderType("pickup");
  }, [canPickup, canDeliver, orderType]);

  // Turnstile is rendered explicitly so it also works after client-side navigation.
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [turnstileReady, setTurnstileReady] = useState(!TURNSTILE_SITE_KEY);
  const renderTurnstile = () => {
    const ts = (window as any).turnstile;
    if (!TURNSTILE_SITE_KEY || !ts || !turnstileRef.current || turnstileWidget.current) return;
    turnstileWidget.current = ts.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY, language: lang,
      callback: (token: string) => { setTurnstileToken(token); setTurnstileReady(true); },
      "expired-callback": () => setTurnstileToken(undefined),
      "error-callback": () => setTurnstileToken(undefined),
    });
  };
  useEffect(() => () => { if (turnstileWidget.current) (window as any).turnstile?.remove?.(turnstileWidget.current); }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const zone = config.zones.find((z) => String(z.id) === form.zoneId);
  const subtotal = cartSubtotal(lines);
  const fee = orderType === "delivery" && zone ? zone.fee : 0;
  const total = subtotal + fee;
  const zoneName = (z: { name: string; nameAr: string | null }) => (lang === "ar" && z.nameAr ? z.nameAr : z.name);

  const phoneOk = !!lebaneseMobileNational(form.phone);
  const problems: string[] = [];
  if (!canPickup && !canDeliver) problems.push(t.checkout.neitherAvailable);
  if (orderType === "delivery" && zone && subtotal < zone.minOrder) problems.push(fill(t.checkout.minOrder, { area: zoneName(zone), min: money(zone.minOrder) }));
  if (total > config.maxOrderUsd) problems.push(fill(t.checkout.maxOrder, { max: money(config.maxOrderUsd) }));
  if (!config.open) problems.push(config.unreachable ? t.status.unreachable : config.reason === "paused" ? config.message || t.status.pausedHint : t.checkout.closed);

  const missing = {
    name: form.name.trim().length < 2,
    phone: !phoneOk,
    zone: orderType === "delivery" && !zone,
    street: orderType === "delivery" && form.street.trim().length < 2,
    building: orderType === "delivery" && !form.building.trim(),
  };
  const valid = !Object.values(missing).some(Boolean) && agree && problems.length === 0 && lines.length > 0 && (!TURNSTILE_SITE_KEY || !!turnstileToken);

  const errorText = (code: string, fallback?: string) => (t.checkout.errors as Record<string, string>)[code] || fallback || t.checkout.error;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!valid || submitting) {
      setTimeout(() => document.querySelector("[data-invalid], [data-problem]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          customer: { name: form.name.trim(), phone: form.phone },
          address: orderType === "delivery" ? {
            zoneId: Number(form.zoneId), street: form.street.trim(), building: form.building.trim(),
            floor: form.floor.trim(), landmark: form.landmark.trim(),
          } : undefined,
          items: lines.map((l) => ({ productId: l.productId, sizeId: l.sizeId, quantity: l.quantity, addonIds: l.addonIds, notes: l.notes })),
          notes: form.notes.trim(),
          couponCode: form.coupon.trim() || undefined,
          lang,
          website: form.website,
          formMs: Date.now() - openedAt.current,
          turnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ code: data.code || "server", message: errorText(data.code, data.message) });
        if (turnstileWidget.current) (window as any).turnstile?.reset?.(turnstileWidget.current);
        setTurnstileToken(undefined);
        if (data.code === "closed" || data.code === "paused") router.refresh();
        return;
      }
      const name = form.name.trim();
      saveOrder({ orderNumber: data.orderNumber, token: data.trackingToken, total: data.total, createdAt: new Date().toISOString(), name });
      saveProfile({ name, phone: form.phone, zoneId: zone?.id, street: form.street.trim(), building: form.building.trim(), floor: form.floor.trim(), landmark: form.landmark.trim() });
      markJustPlaced(data.trackingToken);
      clear();
      setPlaced({ orderNumber: data.orderNumber, token: data.trackingToken, name });
      router.prefetch(`/${lang}/track/${data.trackingToken}`);
    } catch {
      setError({ code: "network", message: errorText("network") });
    } finally {
      setSubmitting(false);
    }
  };

  if (placed) return <ThankYou placed={placed} lang={lang} t={t} />;
  if (!mounted) return <div className="min-h-[60vh]" />;

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-paper-2 text-muted"><ShoppingBag className="h-7 w-7" /></span>
        <p className="mt-5 font-display text-3xl text-ink">{t.cart.empty}</p>
        <p className="mt-1 text-muted">{t.cart.emptyHint}</p>
        <Link href={`/${lang}#menu`} className="mt-7 inline-flex h-12 items-center rounded-full bg-brand px-6 font-semibold text-white hover:bg-brand-600">{t.checkout.back}</Link>
      </div>
    );
  }

  const err = (k: keyof typeof missing) => touched && missing[k];
  const invalidAttr = (k: keyof typeof missing) => (err(k) ? { "data-invalid": true, "aria-invalid": true as const, "aria-describedby": `${k}-err` } : {});
  const ErrMsg = ({ k, text }: { k: keyof typeof missing; text?: string }) => err(k) ? <p id={`${k}-err`} className="mt-1 text-xs font-semibold text-brand-700">{text || t.checkout.required}</p> : null;
  const border = (k: keyof typeof missing) => (err(k) ? "border-brand" : "border-line");

  return (
    <form onSubmit={submit} noValidate className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_400px] lg:gap-8 lg:px-8">
      {TURNSTILE_SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer onLoad={renderTurnstile} onReady={renderTurnstile} />}

      <div className="min-w-0 space-y-5">
        <div className="flex items-center gap-4">
          <Link href={`/${lang}#menu`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:border-ink" aria-label={t.checkout.back}><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></Link>
          <div>
            <h1 className="font-display text-[2.6rem] leading-none text-ink sm:text-5xl">{t.checkout.title}</h1>
            <p className="mt-1 text-sm text-muted">{t.checkout.subtitle}</p>
          </div>
        </div>

        {notice && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink">{notice === "removed" ? t.cart.removedItems : t.cart.pricesUpdated}</p>}
        {problems.map((p) => <p key={p} data-problem className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">{p}</p>)}

        {/* 1 — How */}
        <section className={`${card} space-y-5`}>
          <Step n={1} title={t.checkout.how} />
          <div className="grid grid-cols-2 gap-3">
            {(["pickup", "delivery"] as const).map((type) => {
              const enabled = type === "pickup" ? canPickup : canDeliver;
              const on = orderType === type;
              return (
                <button
                  type="button" key={type} disabled={!enabled} onClick={() => setOrderType(type)} aria-pressed={on}
                  className={`relative flex flex-col items-start rounded-2xl border-2 p-4 text-start transition-colors disabled:opacity-40 ${on ? "border-ink bg-paper" : "border-line hover:border-line-strong"}`}
                >
                  {type === "pickup" ? <Store className="h-6 w-6 text-ink" /> : <Bike className="h-6 w-6 text-ink" />}
                  <span className="mt-3 block font-display text-2xl leading-none text-ink">{type === "pickup" ? t.checkout.pickup : t.checkout.delivery}</span>
                  <span className="mt-1.5 block text-xs text-muted">
                    {type === "pickup" ? (enabled ? fill(t.checkout.pickupHint, { min: config.eta?.pickupMinutes ?? config.pickupMinutes }) : t.checkout.pickupOff) : enabled ? t.checkout.deliveryHint : t.checkout.deliveryOff}
                  </span>
                  {on && <motion.span layoutId="how-check" transition={spring} className="absolute end-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-ink text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></motion.span>}
                </button>
              );
            })}
          </div>

          <AnimatePresence initial={false}>
            {orderType === "delivery" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: easeOut }} className="overflow-hidden">
                <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={label} htmlFor="zone">{t.checkout.area}</label>
                    <select id="zone" value={form.zoneId} onChange={set("zoneId")} className={`${field} ${border("zone")}`} required {...invalidAttr("zone")}>
                      <option value="">{t.checkout.chooseArea}</option>
                      {config.zones.map((z) => <option key={z.id} value={z.id}>{zoneName(z)} · {money(z.fee)}</option>)}
                    </select>
                    <ErrMsg k="zone" />
                    <p className="mt-1 text-xs text-muted">{zone ? fill(t.checkout.areaFee, { fee: money(zone.fee), min: money(zone.minOrder), eta: zone.etaMinutes }) : t.checkout.notListed}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label} htmlFor="street">{t.checkout.street}</label>
                    <input id="street" value={form.street} onChange={set("street")} maxLength={160} autoComplete="street-address" className={`${field} ${border("street")}`} {...invalidAttr("street")} />
                    <ErrMsg k="street" />
                  </div>
                  <div>
                    <label className={label} htmlFor="building">{t.checkout.building}</label>
                    <input id="building" value={form.building} onChange={set("building")} maxLength={120} className={`${field} ${border("building")}`} {...invalidAttr("building")} />
                    <ErrMsg k="building" />
                  </div>
                  <div>
                    <label className={label} htmlFor="floor">{t.checkout.floor}</label>
                    <input id="floor" value={form.floor} onChange={set("floor")} maxLength={40} className={`${field} border-line`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label} htmlFor="landmark">{t.checkout.landmark}</label>
                    <input id="landmark" value={form.landmark} onChange={set("landmark")} maxLength={160} placeholder={t.checkout.landmarkPlaceholder} className={`${field} border-line`} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 2 — You */}
        <section className={`${card} space-y-5`}>
          <Step n={2} title={t.checkout.you} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="name">{t.checkout.name}</label>
              <input id="name" value={form.name} onChange={set("name")} maxLength={80} autoComplete="name" className={`${field} ${border("name")}`} {...invalidAttr("name")} />
              <ErrMsg k="name" />
            </div>
            <div>
              <label className={label} htmlFor="phone">{t.checkout.phone}</label>
              <div dir="ltr" className={`flex h-12 overflow-hidden rounded-xl border bg-surface focus-within:border-ink ${border("phone")}`}>
                <span className="grid place-items-center border-e border-line bg-paper px-3 text-sm font-medium text-muted">+961</span>
                <input
                  id="phone" type="tel" inputMode="tel" autoComplete="tel-national"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^\d\s+()-]/g, "").slice(0, 20) }))}
                  placeholder="03 123 456"
                  className="w-0 min-w-0 flex-1 px-3 text-ink outline-none"
                  {...invalidAttr("phone")}
                />
                {phoneOk && <span className="grid place-items-center px-3 text-basil" aria-hidden><Check className="h-4 w-4" strokeWidth={3} /></span>}
              </div>
              {err("phone") ? <ErrMsg k="phone" text={t.checkout.phoneInvalid} /> : <p className="mt-1 text-xs text-muted">{t.checkout.phoneHint}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="notes">{t.checkout.notes}</label>
              <textarea id="notes" value={form.notes} onChange={set("notes")} maxLength={300} rows={2} placeholder={t.checkout.notesPlaceholder} className={`${field} h-auto border-line py-3`} />
              <label className={`${label} mt-4`} htmlFor="coupon">{t.checkout.coupon}</label>
              <input id="coupon" value={form.coupon} onChange={(e) => setForm((f) => ({ ...f, coupon: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30) }))} maxLength={30} autoComplete="off" placeholder={t.checkout.couponPlaceholder} dir="ltr" className={`${field} border-line uppercase tracking-wider`} />
              {form.coupon && <p className="mt-1 text-xs text-muted">{t.checkout.couponHint}</p>}
            </div>
            {/* Honeypot: hidden from people, bots fill it in. */}
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
              <label htmlFor="website">Website</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </div>
          </div>
        </section>

        {/* 3 — Confirm */}
        <section className={`${card} space-y-5`}>
          <Step n={3} title={t.checkout.stepConfirm} />
          <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-paper p-4">
            <Banknote className="h-6 w-6 shrink-0 text-ink" />
            <div>
              <p className="font-semibold text-ink">{orderType === "delivery" ? t.checkout.cashDelivery : t.checkout.cashPickup}</p>
              <p className="text-xs text-muted">{t.checkout.cashNote}</p>
            </div>
          </div>
          <div className={`rounded-2xl border p-4 ${touched && !agree ? "border-brand bg-brand-50" : "border-line bg-paper"}`} {...(touched && !agree ? { "data-invalid": true } : {})}>
            <h3 className="flex items-center gap-2 font-semibold text-ink"><Info className="h-4 w-4 text-muted" /> {t.checkout.confirmTitle}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t.checkout.confirmText}</p>
            <label className="mt-3 -mx-2 flex cursor-pointer items-start gap-3 rounded-xl p-2 text-sm font-medium text-ink">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#15110f]" aria-describedby="agree-err" />
              {t.checkout.agree}
            </label>
            {touched && !agree && <p id="agree-err" className="text-xs font-semibold text-brand-700">{t.checkout.agreeRequired}</p>}
          </div>
          {TURNSTILE_SITE_KEY && (
            <div>
              <div ref={turnstileRef} />
              {!turnstileReady && <p className="mt-1 text-xs text-muted">{t.checkout.securityLoading}</p>}
            </div>
          )}
        </section>
      </div>

      {/* Summary */}
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
        <section className={card}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl leading-none text-ink">{t.checkout.summary}</h2>
            <Link href={`/${lang}#menu`} className="text-sm font-semibold text-brand-700 hover:underline">{t.checkout.edit}</Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3 py-3">
                {l.imageUrl ? <Photo src={l.imageUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg" imgClassName="h-full w-full" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-paper-2 font-display text-lg text-muted">{l.quantity}×</span>}
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold text-ink">{l.quantity} × {l.name}</span>
                  {(l.sizeName || l.addonNames.length > 0) && <span className="block text-muted">{[l.sizeName && sizeLabel(l.sizeName, lang), ...l.addonNames.map((a) => `+ ${a}`)].filter(Boolean).join(" · ")}</span>}
                  {l.notes && <span className="block italic text-muted">“{l.notes}”</span>}
                </span>
                <span className="text-sm font-semibold tabular-nums text-ink">{money(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted"><span>{t.cart.subtotal}</span><span className="tabular-nums">{money(subtotal)}</span></div>
            {orderType === "delivery" && <div className="flex justify-between text-muted"><span>{t.cart.delivery}{zone ? ` · ${zoneName(zone)}` : ""}</span><span className="tabular-nums">{zone ? money(fee) : "—"}</span></div>}
            <div className="flex items-baseline justify-between pt-2"><span className="font-semibold text-ink">{t.cart.total}</span><span className="font-display text-3xl text-ink">{money(total)}</span></div>
          </div>
        </section>

        {error && (
          <div role="alert" data-problem className="space-y-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
            <p>{error.message}</p>
            {error.code === "menu_changed" && <button type="button" onClick={() => router.refresh()} className="underline">{t.checkout.refreshMenu}</button>}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || preview}
          className="hidden h-13 w-full items-center justify-center gap-2 rounded-full bg-brand font-semibold text-white shadow-glow hover:bg-brand-600 disabled:bg-paper-2 disabled:text-muted disabled:shadow-none lg:flex"
        >
          {submitting ? t.checkout.placing : <>{t.checkout.place} · {money(total)} <ArrowRight className="h-4 w-4 rtl:rotate-180" /></>}
        </button>
        {preview && <p className="text-center text-sm text-muted">{t.status.preview}</p>}
      </aside>

      {/* Phones & tablets: total and "Place order" always in reach. Same form, same submit. */}
      <div data-bottom-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="shrink-0 leading-tight">
            <p className="text-xs text-muted">{t.cart.total}</p>
            <p className="font-display text-2xl text-ink">{money(total)}</p>
          </div>
          <button type="submit" disabled={submitting || preview} className="h-12 min-w-0 flex-1 truncate rounded-full bg-brand px-4 font-semibold text-white hover:bg-brand-600 disabled:bg-paper-2 disabled:text-muted">
            {submitting ? t.checkout.placing : t.checkout.place}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Full-screen "Thank you" after a successful order, then on to tracking. */
function ThankYou({ placed, lang, t }: { placed: Placed; lang: Locale; t: Messages }) {
  const router = useRouter();
  const href = `/${lang}/track/${placed.token}`;
  const first = placed.name.split(/\s+/)[0];
  useEffect(() => {
    const id = setTimeout(() => router.push(href), 7000);
    return () => clearTimeout(id);
  }, [href, router]);

  return (
    <div className="oven-glow fixed inset-0 z-50 grid place-items-center overflow-hidden px-6 text-center text-cream">
      {/* a few warm sparks */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], y: -140 - (i % 5) * 50, x: (i - 7) * 48, scale: [0.4, 1, 0.6] }}
          transition={{ duration: 1.6 + (i % 4) * 0.25, delay: 0.25 + i * 0.05, ease: "easeOut" }}
          className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full ${i % 3 === 0 ? "bg-yolk" : i % 3 === 1 ? "bg-brand" : "bg-cream"}`}
        />
      ))}
      <div className="relative max-w-md">
        <motion.span
          initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-basil-400 text-coal shadow-glow"
        >
          <motion.span initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}><Check className="h-12 w-12" strokeWidth={3.5} /></motion.span>
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7, ease: easeOut }} className="mt-8 font-display text-[clamp(3rem,10vw,5.5rem)] leading-[0.9]">
          {first ? fill(t.thanks.title, { name: first }) : t.thanks.titleNoName}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7, ease: easeOut }} className="mt-4 text-lg text-cream-2">{t.thanks.subtitle}</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm">
          <span className="text-cream-2">{t.thanks.orderNumber}</span> <span className="font-display text-xl text-yolk" dir="ltr">#{placed.orderNumber.slice(-3)}</span> <span className="text-cream-2" dir="ltr">· {placed.orderNumber}</span>
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.7, ease: easeOut }} className="mt-8">
          <Link href={href} className="inline-flex h-14 items-center gap-2 rounded-full bg-brand px-8 text-lg font-semibold text-white shadow-glow hover:bg-brand-600">
            {t.thanks.track} <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </Link>
          <div className="mx-auto mt-5 h-1 w-40 overflow-hidden rounded-full bg-white/10">
            <motion.span initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 7, ease: "linear" }} className="block h-full bg-yolk" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
