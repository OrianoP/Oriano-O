"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

const input = "w-full h-12 rounded-2xl border-2 border-cream-300 bg-white px-4 text-ink placeholder:text-ink-soft/50 focus:border-brand outline-none transition";
const label = "block text-sm font-bold text-ink mb-1.5";

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
        <div className="text-6xl" aria-hidden>🍕</div>
        <p className="mt-4 text-ink-soft">{t.cart.empty}</p>
        <Link href={`/${lang}#menu`} className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 font-black text-white shadow-pop">{t.checkout.back}</Link>
      </div>
    );
  }

  const err = (k: keyof typeof missing) => touched && missing[k];

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-6xl px-4 py-6 grid gap-6 lg:grid-cols-[1fr_380px] items-start">
      {TURNSTILE_SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <div className="space-y-6 min-w-0">
        <div className="flex items-center gap-3">
          <Link href={`/${lang}#menu`} className="h-10 w-10 grid place-items-center rounded-full bg-white shadow-card text-ink rtl:rotate-180" aria-label={t.checkout.back}>←</Link>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-ink">{t.checkout.title}</h1>
        </div>

        {removedSome && (
          <p className="rounded-2xl bg-yolk-100 px-4 py-3 text-sm font-semibold text-ink">{t.checkout.removedItems}</p>
        )}

        {/* How */}
        <section className="rounded-3xl bg-white p-5 shadow-card space-y-4">
          <h2 className="font-display text-xl font-black text-ink">{t.checkout.how}</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["pickup", "delivery"] as const).map((type) => {
              const enabled = type === "pickup" ? canPickup : canDeliver;
              return (
                <button
                  type="button"
                  key={type}
                  disabled={!enabled}
                  onClick={() => setOrderType(type)}
                  className={`rounded-2xl border-2 p-4 text-start transition disabled:opacity-40 ${orderType === type ? "border-brand bg-brand-50" : "border-cream-300 hover:border-brand/40"}`}
                  aria-pressed={orderType === type}
                >
                  <span className="text-2xl" aria-hidden>{type === "pickup" ? "🛍️" : "🛵"}</span>
                  <span className="block font-black text-ink mt-1">{type === "pickup" ? t.checkout.pickup : t.checkout.delivery}</span>
                  <span className="block text-xs text-ink-soft mt-0.5">
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
                <p className="mt-1 text-xs text-ink-soft">{t.checkout.notListed}</p>
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
        <section className="rounded-3xl bg-white p-5 shadow-card grid gap-4 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-display text-xl font-black text-ink">{t.checkout.you}</h2>
          <div>
            <label className={label} htmlFor="name">{t.checkout.name}</label>
            <input id="name" value={form.name} onChange={set("name")} maxLength={80} autoComplete="name" className={`${input} ${err("name") ? "border-brand" : ""}`} />
            {err("name") && <p className="mt-1 text-xs font-semibold text-brand-700">{t.checkout.required}</p>}
          </div>
          <div>
            <label className={label} htmlFor="phone">{t.checkout.phone}</label>
            <div dir="ltr" className={`flex h-12 rounded-2xl border-2 bg-white overflow-hidden focus-within:border-brand transition ${err("phone") ? "border-brand" : "border-cream-300"}`}>
              <span className="grid place-items-center px-3 bg-cream-200 font-bold text-ink-soft text-sm">🇱🇧 +961</span>
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
              {phoneOk && <span className="grid place-items-center px-3 text-basil font-black" aria-hidden>✓</span>}
            </div>
            <p id="phone-hint" className={`mt-1 text-xs ${err("phone") ? "font-semibold text-brand-700" : "text-ink-soft"}`}>
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

        <section className="rounded-3xl bg-white p-5 shadow-card space-y-2">
          <h2 className="font-display text-xl font-black text-ink">{t.checkout.payment}</h2>
          <div className="flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand-50 p-4">
            <span className="text-2xl" aria-hidden>💵</span>
            <div>
              <p className="font-black text-ink">{orderType === "delivery" ? t.checkout.cashDelivery : t.checkout.cashPickup}</p>
              <p className="text-xs text-ink-soft">{t.checkout.cashNote}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 space-y-4 min-w-0">
        <section className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="font-display text-xl font-black text-ink mb-3">{t.checkout.summary}</h2>
          <ul className="divide-y divide-cream-200 text-sm">
            {lines.map((l) => (
              <li key={l.key} className="py-2 flex gap-2">
                <span className="font-black text-brand">{l.quantity}×</span>
                <span className="flex-1 text-ink">
                  {l.name}
                  {l.sizeName && <span className="text-ink-soft"> · {sizeLabel(l.sizeName, lang)}</span>}
                  {l.addonNames.length > 0 && <span className="block text-xs text-ink-soft">+ {l.addonNames.join(", ")}</span>}
                </span>
                <span className="font-bold tabular-nums">{money(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-cream-200 pt-3 text-sm">
            <div className="flex justify-between text-ink-soft"><span>{t.cart.subtotal}</span><span className="tabular-nums">{money(subtotal)}</span></div>
            {orderType === "delivery" && (
              <div className="flex justify-between text-ink-soft"><span>{t.cart.delivery}</span><span className="tabular-nums">{zone ? money(fee) : "—"}</span></div>
            )}
            <div className="flex justify-between text-xl font-black text-ink pt-1"><span>{t.cart.total}</span><span className="tabular-nums">{money(total)}</span></div>
          </div>
        </section>

        <section className="rounded-3xl bg-yolk-100 border-2 border-yolk p-5 space-y-3">
          <h2 className="font-black text-ink">⚠️ {t.checkout.confirmTitle}</h2>
          <p className="text-sm text-ink">{t.checkout.confirmText}</p>
          <label className="flex items-start gap-3 text-sm font-semibold text-ink cursor-pointer">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#ff3300]" />
            {t.checkout.agree}
          </label>
        </section>

        {TURNSTILE_SITE_KEY && (
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-callback="orianoTurnstile" data-language={lang} />
        )}

        {problems.map((p) => (
          <p key={p} className="rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3 text-sm font-semibold text-brand-700">{p}</p>
        ))}
        {error && (
          <div role="alert" className="rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3 text-sm font-semibold text-brand-700 space-y-2">
            <p>{error.message}</p>
            {error.code === "menu_changed" && (
              <button type="button" onClick={() => router.refresh()} className="underline">{t.checkout.refreshMenu}</button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || preview || (touched && !valid)}
          className="w-full h-16 rounded-full bg-brand text-white text-lg font-black shadow-pop hover:bg-brand-600 active:scale-[0.98] transition disabled:bg-cream-300 disabled:text-ink-soft disabled:shadow-none"
        >
          {submitting ? t.checkout.placing : `${t.checkout.place} · ${money(total)}`}
        </button>
        {preview && <p className="text-center text-sm font-semibold text-ink-soft">{t.status.preview}</p>}
      </aside>
    </form>
  );
}
