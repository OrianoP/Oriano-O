"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LogOut, Pencil, Trash2, UserRound, X } from "lucide-react";
import { useAccount, type AddressInput } from "@/lib/accountStore";
import { formatLebaneseMobile, lebaneseMobileNational } from "@/lib/phone";
import { fill, type Locale } from "@/lib/i18n";
import type { Zone } from "@/lib/types";
import type { Messages } from "@/messages/en";
import { SignInForm } from "./SignInForm";
import { AddressForm, addressSummary, labelIcon, labelText, zoneLabel } from "./AddressForm";
import { spring } from "./motion";
import { useIsPhone } from "@/lib/useIsPhone";

/** Side panel: sign in, or see your name and manage saved addresses. */
export function AccountSheet({ lang, t, zones }: { lang: Locale; t: Messages; zones: Zone[] }) {
  const { sheetOpen, setSheetOpen, load, signedIn, signInAvailable, me, signOut, removeAddress, updateAddress } = useAccount();
  const addresses = useAccount((s) => (s.signedIn ? s.me?.addresses ?? [] : s.guestAddresses));
  const reduce = useReducedMotion();
  const panel = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState<{ id: string; value: AddressInput } | null>(null);
  const a = t.account;

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!sheetOpen) { setEditing(null); return; }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [sheetOpen, setSheetOpen]);

  const fromEnd = lang === "ar" ? "-100%" : "100%";
  const phone = useIsPhone();
  const hidden = reduce ? { opacity: 0 } : phone ? { y: "100%" } : { x: fromEnd };
  const national = me ? lebaneseMobileNational(me.phone) : null;

  return (
    <AnimatePresence>
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch" role="dialog" aria-modal="true" aria-labelledby="account-title">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-coal/60 backdrop-blur-[2px]" onClick={() => setSheetOpen(false)} aria-label={t.item.close} />
          <motion.aside
            ref={panel}
            initial={hidden} animate={{ x: 0, y: 0, opacity: 1 }} exit={hidden}
            transition={{ ...spring, stiffness: 320, damping: 34 }}
            className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none"
          >
            <div className="shrink-0 border-b border-line bg-surface sm:pt-[env(safe-area-inset-top)]">
              <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
              <div className="flex h-16 items-center justify-between ps-5 pe-3 sm:ps-6">
                <h2 id="account-title" className="font-display text-3xl text-ink">{signedIn ? (me?.name ? fill(a.hello, { name: me.name.split(/\s+/)[0] }) : a.helloNoName) : a.title}</h2>
                <button onClick={() => setSheetOpen(false)} className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-paper-2" aria-label={t.item.close}><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
              {signedIn ? (
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white"><UserRound className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-semibold text-ink">{me?.name || "—"}</div>
                    <div className="text-muted" dir="ltr">{fill(a.signedInAs, { phone: national ? formatLebaneseMobile(national) : me?.phone || "" })}</div>
                  </div>
                  <button onClick={() => void signOut()} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-ink hover:border-ink" data-testid="sign-out">
                    <LogOut className="h-4 w-4" /> {a.signOut}
                  </button>
                </div>
              ) : signInAvailable ? (
                <section className="space-y-3">
                  <p className="text-sm text-muted">{a.why}</p>
                  <SignInForm lang={lang} t={t} />
                </section>
              ) : (
                <p className="text-sm text-muted">{a.guestHint}</p>
              )}

              <section className="space-y-3">
                <h3 className="font-display text-2xl text-ink">{signedIn ? a.addresses : a.onThisPhone}</h3>
                {addresses.length === 0 && <p className="text-sm text-muted">{a.noAddresses}</p>}
                {addresses.map((ad) => {
                  const Icon = labelIcon(ad.label);
                  const zone = zones.find((z) => z.id === ad.zoneId);
                  if (editing?.id === ad.id) {
                    return (
                      <div key={ad.id} className="space-y-3 rounded-2xl border-2 border-ink bg-surface p-4">
                        <AddressForm value={editing.value} onChange={(value) => setEditing({ id: ad.id, value })} zones={zones} lang={lang} t={t} idPrefix="acct-" />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditing(null)} className="h-10 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">{a.cancel}</button>
                          <button
                            onClick={async () => { const v = editing.value; if (!v.zoneId || !v.street.trim() || !v.building.trim()) return; await updateAddress(ad.id, v); setEditing(null); }}
                            className="h-10 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-600">{a.save}</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={ad.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4" data-testid="account-address">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper-2 text-ink"><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink">{labelText(ad.label, t)}</div>
                        <div className="truncate text-sm text-muted">{addressSummary(ad, t)}</div>
                        <div className="text-xs text-muted">{zone ? zoneLabel(zone, lang) : t.addresses.notDelivered}</div>
                      </div>
                      <button onClick={() => { const { id, ...value } = ad; setEditing({ id, value }); }} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-ink" aria-label={a.edit}><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => void removeAddress(ad.id)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-brand-700" aria-label={a.remove}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  );
                })}
              </section>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Header button: a person icon, filled once signed in. */
export function AccountButton({ t }: { t: Messages }) {
  const { setSheetOpen, load, signedIn, me } = useAccount();
  useEffect(() => { void load(); }, [load]);
  const initial = signedIn && me?.name ? me.name.trim()[0]?.toUpperCase() : null;
  return (
    <button onClick={() => setSheetOpen(true)} aria-label={t.account.open} data-testid="account-button"
      className={`grid h-11 w-11 place-items-center rounded-full ${signedIn ? "bg-cream text-coal font-bold" : "text-cream-2 hover:bg-white/10 hover:text-cream"}`}>
      {initial || <UserRound className="h-5 w-5" />}
    </button>
  );
}
