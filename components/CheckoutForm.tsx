"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Banknote, Bike, Check, Info, Plus, ShoppingBag, Store, UserRound } from "lucide-react";
import { cartSubtotal, loadProfile, markJustPlaced, reconcileLines, saveOrder, saveProfile, useCart } from "@/lib/cart";
import { money } from "@/lib/menu";
import { lebaneseMobileNational } from "@/lib/phone";
import { fill, sizeLabel, type Locale } from "@/lib/i18n";
import type { Menu, ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";
import { Photo } from "./Photo";
import { useAccount } from "@/lib/accountStore";
import { AddressForm, addressSummary, labelIcon, labelText } from "./AddressForm";
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
  // Most orders are deliveries: start there (or on what this customer chose last time).
  const [orderType, setOrderType] = useState<"pickup" | "delivery">(canDeliver ? "delivery" : "pickup");
  const [form, setForm] = useState({ name: "", phone: "", zoneId: "", street: "", building: "", floor: "", landmark: "", notes: "", coupon: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);
  // Opens the instant the customer taps "Place order"; the order number fills in when the POS answers.
  const [sendingName, setSendingName] = useState<string | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>();

  // ── Saved addresses (account or this phone) ──
  const account = useAccount();
  const savedAddresses = account.signedIn ? account.me?.addresses ?? [] : account.guestAddresses;
  const [addrChoice, setAddrChoice] = useState<string>("new"); // a saved address id, or "new"
  const [addrLabel, setAddrLabel] = useState("Home");
  const [saveAddress, setSaveAddress] = useState(true);
  const addrPicked = useRef(false);
  useEffect(() => { void account.load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const deliverable = (zoneId: number | null) => !!zoneId && config.zones.some((z) => z.id === zoneId);
  const chooseAddress = (id: string) => {
    const a = savedAddresses.find((x) => x.id === id);
    if (!a || !deliverable(a.zoneId)) return;
    setAddrChoice(id);
    setForm((f) => ({ ...f, zoneId: String(a.zoneId), street: a.street, building: a.building, floor: a.floor, landmark: a.landmark }));
  };
  const newAddress = () => {
    setAddrChoice("new"); setAddrLabel(savedAddresses.some((a) => a.label === "Home") ? "Other" : "Home");
    setForm((f) => ({ ...f, zoneId: "", street: "", building: "", floor: "", landmark: "" }));
  };
  // Once the account/address book has loaded: pick the most recent address we still deliver to,
  // and fill in the signed-in customer's name and number.
  useEffect(() => {
    if (account.status !== "ready" || addrPicked.current) return;
    addrPicked.current = true;
    if (account.signedIn && account.me) {
      const me = account.me;
      setForm((f) => ({ ...f, name: f.name || me.name, phone: f.phone || me.phone }));
    }
    const first = savedAddresses.find((a) => deliverable(a.zoneId));
    if (first) chooseAddress(first.id);
  }, [account.status, account.signedIn]); // eslint-disable-line react-hooks/exhaustive-deps
  // Signed in from the checkout: show their saved addresses and pick the latest one.
  const wasSignedIn = useRef(account.signedIn);
  useEffect(() => {
    if (account.signedIn && !wasSignedIn.current) {
      const me = account.me;
      if (me) setForm((f) => ({ ...f, name: f.name || me.name, phone: f.phone || me.phone }));
      const first = (me?.addresses ?? []).find((a) => deliverable(a.zoneId));
      if (first && (addrChoice === "new" || !savedAddresses.some((a) => a.id === addrChoice))) chooseAddress(first.id);
    }
    wasSignedIn.current = account.signedIn;
  }, [account.signedIn, account.me]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMounted(true);
    const p = loadProfile();
    if (p.orderType === "pickup" && canPickup) setOrderType("pickup");
    setForm((f) => ({
      ...f,
      name: p.name || "", phone: p.phone || "", zoneId: p.zoneId ? String(p.zoneId) : "",
      street: p.street || "", building: p.building || "", floor: p.floor || "", landmark: p.landmark || "",
    }));
  }, []);

  // Always start at the top: the cart drawer may still be releasing the page lock when this mounts.
  useEffect(() => {
    const top = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    top();
    const raf = requestAnimationFrame(top);
    const id = setTimeout(top, 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(id); };
  }, []);

  // Wake the order route and its link to the restaurant while the customer fills the form.
  useEffect(() => {
    const warm = () => { fetch("/api/order", { method: "GET", cache: "no-store" }).catch(() => {}); };
    warm();
    const id = setInterval(warm, 4 * 60_000);
    return () => clearInterval(id);
  }, []);

  // The shop can close or pause while someone is filling the form.
  useEffect(() => {
    const tick = async () => {
      try { const r = await fetch("/api/config", { cache: "no-store" }); if (r.ok) setConfig(await r.json()); } catch {}
    };
    void tick(); // live status right away; the page itself opened from the cached copy
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
    setSendingName(form.name.trim());
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
          items: lines.filter((l) => !l.deal).map((l) => ({ productId: l.productId, sizeId: l.sizeId, quantity: l.quantity, addonIds: l.addonIds, notes: l.notes })),
          deals: lines.filter((l) => l.deal).map((l) => ({ dealId: l.deal!.dealId, quantity: l.quantity, picks: l.deal!.picks, notes: l.notes })),
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
        setSendingName(null);
        setError({ code: data.code || "server", message: errorText(data.code, data.message) });
        if (turnstileWidget.current) (window as any).turnstile?.reset?.(turnstileWidget.current);
        setTurnstileToken(undefined);
        if (data.code === "closed" || data.code === "paused") router.refresh();
        return;
      }
      const name = form.name.trim();
      saveOrder({ orderNumber: data.orderNumber, token: data.trackingToken, total: data.total, createdAt: new Date().toISOString(), name });
      saveProfile({ name, phone: form.phone, orderType });
      if (orderType === "delivery" && zone) {
        if (addrChoice !== "new") void account.markUsed(addrChoice);
        else if (saveAddress) void account.addAddress({ label: addrLabel, zoneId: zone.id, street: form.street.trim(), building: form.building.trim(), floor: form.floor.trim(), landmark: form.landmark.trim() }).catch(() => {});
      }
      if (account.signedIn) void account.saveDetails(name, form.phone).catch(() => {});
      markJustPlaced(data.trackingToken);
      clear();
      setPlaced({ orderNumber: data.orderNumber, token: data.trackingToken, name });
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }); // tracking opens at the top
      router.prefetch(`/${lang}/track/${data.trackingToken}`);
    } catch {
      setSendingName(null);
      setError({ code: "network", message: errorText("network") });
    } finally {
      setSubmitting(false);
    }
  };

  // One overlay instance from the tap to the redirect, so it changes in place instead of re-opening.
  const overlay = (
    <AnimatePresence>
      {(sendingName !== null || placed) && <ThankYou key="thanks" placed={placed} name={placed?.name ?? sendingName ?? ""} lang={lang} t={t} />}
    </AnimatePresence>
  );
  if (placed) return <>{overlay}<CheckoutSkeleton /></>;
  if (!mounted) return <>{overlay}<CheckoutSkeleton /></>;

  if (!lines.length) {
    return (
      <>{overlay}
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-paper-2 text-muted"><ShoppingBag className="h-7 w-7" /></span>
        <p className="mt-5 font-display text-3xl text-ink">{t.cart.empty}</p>
        <p className="mt-1 text-muted">{t.cart.emptyHint}</p>
        <Link href={`/${lang}#menu`} className="mt-7 inline-flex h-12 items-center rounded-full bg-brand px-6 font-semibold text-white hover:bg-brand-600">{t.checkout.back}</Link>
      </div>
      </>
    );
  }

  const err = (k: keyof typeof missing) => touched && missing[k];
  const invalidAttr = (k: keyof typeof missing) => (err(k) ? { "data-invalid": true, "aria-invalid": true as const, "aria-describedby": `${k}-err` } : {});
  const ErrMsg = ({ k, text }: { k: keyof typeof missing; text?: string }) => err(k) ? <p id={`${k}-err`} className="mt-1 text-xs font-semibold text-brand-700">{text || t.checkout.required}</p> : null;
  const border = (k: keyof typeof missing) => (err(k) ? "border-brand" : "border-line");

  return (
    <>{overlay}
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
                <div className="space-y-3 pt-1">
                  {savedAddresses.length > 0 && (
                    <div className="space-y-2" role="radiogroup" aria-label={t.addresses.deliverTo}>
                      <div className="text-sm font-medium text-ink">{t.addresses.deliverTo}</div>
                      {savedAddresses.map((a) => {
                        const Icon = labelIcon(a.label);
                        const z = config.zones.find((x) => x.id === a.zoneId);
                        const on = addrChoice === a.id;
                        return (
                          <button type="button" key={a.id} role="radio" aria-checked={on} disabled={!z} onClick={() => chooseAddress(a.id)} data-testid="address-card"
                            className={`relative flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-start transition-colors disabled:opacity-45 ${on ? "border-ink bg-paper" : "border-line hover:border-line-strong"}`}>
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${on ? "bg-ink text-white" : "bg-paper-2 text-ink"}`}><Icon className="h-4 w-4" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-ink">{labelText(a.label, t)}</span>
                              <span className="block truncate text-sm text-muted">{addressSummary(a, t)}</span>
                              <span className="block text-xs text-muted">{z ? `${zoneName(z)} · ${money(z.fee)}` : t.addresses.notDelivered}</span>
                            </span>
                            {on && <motion.span layoutId="addr-check" transition={spring} className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></motion.span>}
                          </button>
                        );
                      })}
                      <button type="button" role="radio" aria-checked={addrChoice === "new"} onClick={newAddress} data-testid="address-new"
                        className={`flex w-full items-center gap-3 rounded-2xl border-2 border-dashed p-3.5 text-start font-semibold transition-colors ${addrChoice === "new" ? "border-ink bg-paper text-ink" : "border-line text-muted hover:border-line-strong hover:text-ink"}`}>
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-paper-2 text-ink"><Plus className="h-4 w-4" /></span>
                        {t.addresses.addNew}
                      </button>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {addrChoice === "new" && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: easeOut }} className="overflow-hidden">
                        <div className="space-y-4 pt-1">
                          <AddressForm
                            value={{ label: addrLabel, zoneId: form.zoneId ? Number(form.zoneId) : null, street: form.street, building: form.building, floor: form.floor, landmark: form.landmark }}
                            onChange={(v) => { setAddrLabel(v.label); setForm((f) => ({ ...f, zoneId: v.zoneId ? String(v.zoneId) : "", street: v.street, building: v.building, floor: v.floor, landmark: v.landmark })); }}
                            zones={config.zones} lang={lang} t={t}
                            errors={{ zone: !!err("zone"), street: !!err("street"), building: !!err("building") }}
                          />
                          <label className="flex items-center gap-2.5 text-sm text-ink">
                            <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-5 w-5 accent-brand" data-testid="save-address" />
                            {t.addresses.saveIt}
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!account.signedIn && account.signInAvailable && (
                    <button type="button" onClick={() => account.setSheetOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline" data-testid="checkout-sign-in">
                      <UserRound className="h-4 w-4" /> {t.account.syncHint}
                    </button>
                  )}
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
                  {(l.sizeName || l.addonNames.length > 0) && <span className="block text-muted">{[l.sizeName && sizeLabel(l.sizeName, lang), ...l.addonNames.map((a) => (l.deal ? a : `+ ${a}`))].filter(Boolean).join(" · ")}</span>}
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
    </>
  );
}

/**
 * Full-screen "Thank you". It opens the moment "Place order" is tapped
 * (placed = null: a spinning ring while the order travels), then the ring
 * turns into the check, the sparks fly and the order number appears when the
 * POS confirms. After 7 s it moves on to tracking.
 */
function ThankYou({ placed, name, lang, t }: { placed: Placed | null; name: string; lang: Locale; t: Messages }) {
  const router = useRouter();
  const href = placed ? `/${lang}/track/${placed.token}` : "";
  const first = name.split(/\s+/)[0];
  const done = !!placed;
  useEffect(() => {
    if (!href) return;
    const id = setTimeout(() => router.push(href), 7000);
    return () => clearTimeout(id);
  }, [href, router]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
      className="oven-glow fixed inset-0 z-50 grid place-items-center overflow-hidden px-6 text-center text-cream"
      role="status" aria-live="polite"
    >
      {/* a few warm sparks, once the order is in */}
      {done && Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], y: -140 - (i % 5) * 50, x: (i - 7) * 48, scale: [0.4, 1, 0.6] }}
          transition={{ duration: 1.6 + (i % 4) * 0.25, delay: 0.05 + i * 0.04, ease: "easeOut" }}
          className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full ${i % 3 === 0 ? "bg-yolk" : i % 3 === 1 ? "bg-brand" : "bg-cream"}`}
        />
      ))}
      <div className="relative max-w-md">
        <SendRing done={done} />
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.45, ease: easeOut }} className="mt-8 font-display text-[clamp(3rem,10vw,5.5rem)] leading-[0.9]">
          {first ? fill(t.thanks.title, { name: first }) : t.thanks.titleNoName}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.45, ease: easeOut }} className="mt-4 text-lg text-cream-2">
          {done ? t.thanks.subtitle : t.thanks.sending}
        </motion.p>
        <div className="mt-6 h-12">
          <AnimatePresence>
            {done && (
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: easeOut }} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm">
                <span className="text-cream-2">{t.thanks.orderNumber}</span> <span className="font-display text-xl text-yolk" dir="ltr">{placed!.orderNumber}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-4 h-[5.5rem]">
          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.45, ease: easeOut }}>
                <Link href={href} className="inline-flex h-14 items-center gap-2 rounded-full bg-brand px-8 text-lg font-semibold text-white shadow-glow hover:bg-brand-600">
                  {t.thanks.track} <ArrowRight className="h-5 w-5 rtl:rotate-180" />
                </Link>
                <div className="mx-auto mt-5 h-1 w-40 overflow-hidden rounded-full bg-white/10">
                  <motion.span initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 7, ease: "linear" }} className="block h-full bg-yolk" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/** Same shape as the checkout, shown for the instant before the cart loads. */
export function CheckoutSkeleton() {
  return (
    <div className="mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 items-start gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_400px] lg:gap-8 lg:px-8" aria-busy="true">
      <div className="space-y-5">
        <div className="flex items-center gap-4"><div className="img-skeleton h-11 w-11 rounded-full" /><div className="img-skeleton h-12 w-52 rounded-xl" /></div>
        <div className="img-skeleton h-64 rounded-3xl" />
        <div className="img-skeleton h-72 rounded-3xl" />
      </div>
      <div className="img-skeleton hidden h-80 rounded-3xl lg:block" />
    </div>
  );
}

/**
 * The ring on the thank-you screen. While sending, an arc circles; when the
 * order is in, the arc closes into a full ring, the disc fills green and the
 * check draws itself, all in one movement.
 */
function SendRing({ done }: { done: boolean }) {
  const R = 44, C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto h-24 w-24">
      <motion.div
        className="absolute inset-0 rounded-full bg-basil-400 shadow-glow"
        initial={false}
        animate={done ? { scale: 1, opacity: 1 } : { scale: 0.55, opacity: 0 }}
        transition={done ? { delay: 0.22, type: "spring", stiffness: 260, damping: 18 } : { duration: 0.2 }}
      />
      <svg viewBox="0 0 96 96" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="48" cy="48" r={R} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="5" />
        <motion.g
          style={{ originX: "48px", originY: "48px" }}
          animate={done ? { rotate: 0 } : { rotate: 360 }}
          transition={done ? { duration: 0.3, ease: "easeOut" } : { repeat: Infinity, duration: 0.9, ease: "linear" }}
        >
          <motion.circle
            cx="48" cy="48" r={R} fill="none" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C}
            initial={false}
            animate={done ? { strokeDashoffset: 0, stroke: "#3ecf6a" } : { strokeDashoffset: C * 0.72, stroke: "#ffd60a" }}
            transition={{ duration: done ? 0.35 : 0.2, ease: "easeOut" }}
          />
        </motion.g>
      </svg>
      <svg viewBox="0 0 96 96" className="absolute inset-0 h-full w-full" aria-hidden>
        <motion.path
          d="M30 49 L43 62 L67 36" fill="none" stroke="#0b0908" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
          initial={false}
          animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={done ? { delay: 0.38, duration: 0.35, ease: "easeOut" } : { duration: 0.1 }}
        />
      </svg>
    </div>
  );
}
