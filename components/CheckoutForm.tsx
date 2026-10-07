"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Banknote, Bike, Check, Info, ShoppingBag, Store } from "lucide-react";
import { cartSubtotal, loadProfile, saveOrder, saveProfile, useCart, type CartLine } from "@/lib/cart";
import { money, unitPrice } from "@/lib/menu";
import { lebaneseMobileNational } from "@/lib/phone";
import { fill, sizeLabel, type Locale } from "@/lib/i18n";
import type { Menu, ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Re-prices cart lines against the current menu and drops anything no longer sold. */
function reconcile(lines: CartLine[], menu: Menu): CartLine[] {
  return lines.flatMap((l) => {
    const p = menu.products.find((x) => x.id === l.productId);
    if (!p) return [];
    const size = p.sizes.find((s) => s.id === l.sizeId) || null;
    if (p.sizes.length && !size) return [];
    const addonIds = l.addonIds.filter((id) => p.addons.some((a) => a.id === id));
    return [{ ...l, addonIds, name: p.name, sizeName: size?.name, unitPrice: unitPrice(p, size, addonIds) }];
  });
}

const input = "w-full h-11 rounded-md border border-line bg-surface px-3.5 text-ink placeholder:text-muted/60 focus:border-ink outline-none";
const label = "block text-sm font-medium text-ink-2 mb-1.5";
const card = "rounded-xl border border-line bg-surface p-5 sm:p-6";
const heading = "text-base font-semibold text-ink";

export function CheckoutForm({ menu, config, lang, t, preview }: { menu: Menu; config: ShopConfig; lang: Locale; t: Messages; preview: boolean }) {
  const router = useRouter();
  const storeLines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const [mounted, setMounted] = useState(false);
  const openedAt = useRef(Date.now());

  const lines = useMemo(() => reconcile(storeLines, menu), [storeLines, menu]);
  const removedSome = mounted && lines.length < storeLines.length;

  const canPickup = config.pickupEnabled;
  const canDeliver = config.deliveryEnabled && config.zones.length > 0;
  const [orderType, setOrderType] = useState<"pickup" | "delivery">(canDeliver && !canPickup ? "delivery" : "pickup");
  const [form, setForm] = useState({ name: "", phone: "", zoneId: "", street: "", building: "", floor: "", landmark: "", notes: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    (window as any).orianoTurnstile = (token: string) => setTurnstileToken(token);
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const zone = config.zones.find((z) => String(z.id) === form.zoneId);
  const subtotal = cartSubtotal(lines);
  const fee = orderType === "delivery" && zone ? zone.fee : 0;
  const total = subtotal + fee;
  const zoneName = (z: { name: string; nameAr: string | null }) => (lang === "ar" && z.nameAr ? z.nameAr : z.name);

  const phoneOk = !!lebaneseMobileNational(form.phone);
  const problems: string[] = [];
  if (orderType === "delivery" && zone && subtotal < zone.minOrder) problems.push(fill(t.checkout.minOrder, { area: zoneName(zone), min: money(zone.minOrder) }));
  if (total > config.maxOrderUsd) problems.push(fill(t.checkout.maxOrder, { max: money(config.maxOrderUsd) }));
  if (!config.open) problems.push(config.reason === "paused" && config.message ? config.message : t.checkout.closed);

  const missing = {
    name: form.name.trim().length < 2,
    phone: !phoneOk,
    zone: orderType === "delivery" && !zone,
    street: orderType === "delivery" && form.street.trim().length < 2,
    building: orderType === "delivery" && !form.building.trim(),
  };
  const valid = !Object.values(missing).some(Boolean) && agree && problems.length === 0 && lines.length > 0 && (!TURNSTILE_SITE_KEY || !!turnstileToken);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!valid || submitting) return;
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
          website: form.website,
          formMs: Date.now() - openedAt.current,
          turnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ code: data.code || "error", message: data.message || t.checkout.error });
        (window as any).turnstile?.reset?.();
        setTurnstileToken(undefined);
        return;
      }
      saveOrder({ orderNumber: data.orderNumber, token: data.trackingToken, total: data.total, createdAt: new Date().toISOString() });
      saveProfile({
        name: form.name.trim(), phone: form.phone, zoneId: zone?.id,
        street: form.street.trim(), building: form.building.trim(), floor: form.floor.trim(), landmark: form.landmark.trim(),
      });
      clear();
      router.push(`/${lang}/track/${data.trackingToken}`);
    } catch {
      setError({ code: "network", message: t.checkout.error });
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return <div className="min-h-[60vh]" />;

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-line-strong" />
        <p className="mt-4 text-muted">{t.cart.empty}</p>
        <Link href={`/${lang}#menu`} className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-6 font-semibold text-white hover:bg-brand-600">{t.checkout.back}</Link>
      </div>
    );
  }

  const err = (k: keyof typeof missing) => touched && missing[k];

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid gap-6 lg:grid-cols-[1fr_380px] items-start">
      {TURNSTILE_SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <div className="space-y-6 min-w-0">
        <div className="flex items-center gap-3">
          <Link href={`/${lang}#menu`} className="grid h-10 w-10 place-items-center rounded-md border border-line bg-surface text-ink hover:border-ink" aria-label={t.checkout.back}><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></Link>
          <h1 className="font-display text-4xl font-extrabold uppercase text-ink rtl:normal-case">{t.checkout.title}</h1>
        </div>

        {removedSome && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink">{t.checkout.removedItems}</p>
        )}

        {/* How */}
        <section className={`${card} space-y-4`}>
          <h2 className={heading}>{t.checkout.how}</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["pickup", "delivery"] as const).map((type) => {
              const enabled = type === "pickup" ? canPickup : canDeliver;
              return (
                <button
                  type="button"
                  key={type}
                  disabled={!enabled}
                  onClick={() => setOrderType(type)}
                  className={`rounded-lg border p-4 text-start disabled:opacity-40 ${orderType === type ? "border-ink bg-paper ring-1 ring-ink" : "border-line hover:border-line-strong"}`}
                  aria-pressed={orderType === type}
                >
                  {type === "pickup" ? <Store className="h-5 w-5 text-ink" /> : <Bike className="h-5 w-5 text-ink" />}
                  <span className="block font-semibold text-ink mt-2">{type === "pickup" ? t.checkout.pickup : t.checkout.delivery}</span>
                  <span className="block text-xs text-muted mt-0.5">
                    {type === "pickup" ? fill(t.checkout.pickupHint, { min: config.pickupMinutes }) : enabled ? t.checkout.deliveryHint : t.checkout.deliveryOff}
                  </span>
                </button>
              );
            })}
          </div>

          {orderType === "delivery" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="zone">{t.checkout.area}</label>
                <select id="zone" value={form.zoneId} onChange={set("zoneId")} className={`${input} ${err("zone") ? "border-brand" : ""}`} required>
                  <option value="">{t.checkout.chooseArea}</option>
                  {config.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {zoneName(z)} — {fill(t.checkout.areaFee, { fee: money(z.fee), min: money(z.minOrder) })}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">{t.checkout.notListed}</p>
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="street">{t.checkout.street}</label>
                <input id="street" value={form.street} onChange={set("street")} maxLength={160} autoComplete="street-address" className={`${input} ${err("street") ? "border-brand" : ""}`} />
              </div>
              <div>
                <label className={label} htmlFor="building">{t.checkout.building}</label>
                <input id="building" value={form.building} onChange={set("building")} maxLength={120} className={`${input} ${err("building") ? "border-brand" : ""}`} />
              </div>
              <div>
                <label className={label} htmlFor="floor">{t.checkout.floor}</label>
                <input id="floor" value={form.floor} onChange={set("floor")} maxLength={40} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="landmark">{t.checkout.landmark}</label>
                <input id="landmark" value={form.landmark} onChange={set("landmark")} maxLength={160} placeholder={t.checkout.landmarkPlaceholder} className={input} />
              </div>
            </div>
          )}
        </section>

        {/* Who */}
        <section className={`${card} grid gap-4 sm:grid-cols-2`}>
          <h2 className={`sm:col-span-2 ${heading}`}>{t.checkout.you}</h2>
          <div>
            <label className={label} htmlFor="name">{t.checkout.name}</label>
            <input id="name" value={form.name} onChange={set("name")} maxLength={80} autoComplete="name" className={`${input} ${err("name") ? "border-brand" : ""}`} />
            {err("name") && <p className="mt-1 text-xs font-semibold text-brand-700">{t.checkout.required}</p>}
          </div>
          <div>
            <label className={label} htmlFor="phone">{t.checkout.phone}</label>
            <div dir="ltr" className={`flex h-11 rounded-md border bg-surface overflow-hidden focus-within:border-ink ${err("phone") ? "border-brand" : "border-line"}`}>
              <span className="grid place-items-center border-e border-line bg-paper px-3 text-sm font-medium text-muted">+961</span>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^\d\s+()-]/g, "").slice(0, 20) }))}
                placeholder="03 123 456"
                className="flex-1 min-w-0 px-3 text-ink outline-none"
                aria-invalid={err("phone") || undefined}
                aria-describedby="phone-hint"
              />
              {phoneOk && <span className="grid place-items-center px-3 text-basil" aria-hidden><Check className="h-4 w-4" /></span>}
            </div>
            <p id="phone-hint" className={`mt-1 text-xs ${err("phone") ? "font-semibold text-brand-700" : "text-muted"}`}>
              {err("phone") ? t.checkout.phoneInvalid : t.checkout.phoneHint}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="notes">{t.checkout.notes}</label>
            <textarea id="notes" value={form.notes} onChange={set("notes")} maxLength={300} rows={2} placeholder={t.checkout.notesPlaceholder} className={`${input} h-auto py-3`} />
          </div>
          {/* Honeypot: hidden from people, bots fill it in. */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
            <label htmlFor="website">Website</label>
            <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
          </div>
        </section>

        <section className={`${card} space-y-3`}>
          <h2 className={heading}>{t.checkout.payment}</h2>
          <div className="flex items-center gap-3 rounded-lg border border-ink bg-paper p-4 ring-1 ring-ink">
            <Banknote className="h-5 w-5 shrink-0 text-ink" />
            <div>
              <p className="font-semibold text-ink">{orderType === "delivery" ? t.checkout.cashDelivery : t.checkout.cashPickup}</p>
              <p className="text-xs text-muted">{t.checkout.cashNote}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 space-y-4 min-w-0">
        <section className={card}>
          <h2 className={`${heading} mb-3`}>{t.checkout.summary}</h2>
          <ul className="divide-y divide-line text-sm">
            {lines.map((l) => (
              <li key={l.key} className="py-2 flex gap-2">
                <span className="font-semibold tabular-nums text-ink">{l.quantity}×</span>
                <span className="flex-1 text-ink">
                  {l.name}
                  {l.sizeName && <span className="text-muted"> · {sizeLabel(l.sizeName, lang)}</span>}
                  {l.addonNames.length > 0 && <span className="block text-xs text-muted">+ {l.addonNames.join(", ")}</span>}
                </span>
                <span className="tabular-nums">{money(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between text-muted"><span>{t.cart.subtotal}</span><span className="tabular-nums">{money(subtotal)}</span></div>
            {orderType === "delivery" && (
              <div className="flex justify-between text-muted"><span>{t.cart.delivery}</span><span className="tabular-nums">{zone ? money(fee) : "—"}</span></div>
            )}
            <div className="flex justify-between text-lg font-semibold text-ink pt-2"><span>{t.cart.total}</span><span className="tabular-nums">{money(total)}</span></div>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-semibold text-ink"><Info className="h-4 w-4 text-muted" /> {t.checkout.confirmTitle}</h2>
          <p className="text-sm leading-relaxed text-muted">{t.checkout.confirmText}</p>
          <label className="flex items-start gap-3 text-sm font-medium text-ink cursor-pointer">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1c1714]" />
            {t.checkout.agree}
          </label>
        </section>

        {TURNSTILE_SITE_KEY && (
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-callback="orianoTurnstile" data-language={lang} />
        )}

        {problems.map((p) => (
          <p key={p} className="rounded-md bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-brand-700">{p}</p>
        ))}
        {error && (
          <div role="alert" className="rounded-md bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-brand-700 space-y-2">
            <p>{error.message}</p>
            {error.code === "menu_changed" && (
              <button type="button" onClick={() => router.refresh()} className="underline">{t.checkout.refreshMenu}</button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || preview || (touched && !valid)}
          className="w-full h-12 rounded-md bg-brand text-white font-semibold hover:bg-brand-600 disabled:bg-paper-2 disabled:text-muted"
        >
          {submitting ? t.checkout.placing : `${t.checkout.place} · ${money(total)}`}
        </button>
        {preview && <p className="text-center text-sm text-muted">{t.status.preview}</p>}
      </aside>
    </form>
  );
}
