"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAccount } from "@/lib/accountStore";
import { formatLebaneseMobile, lebaneseMobileNational } from "@/lib/phone";
import { fill, type Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";

/** Phone → WhatsApp code → signed in. No passwords. */
export function SignInForm({ lang, t, initialPhone = "", initialName = "", onDone }: { lang: Locale; t: Messages; initialPhone?: string; initialName?: string; onDone?: () => void }) {
  const startSignIn = useAccount((s) => s.startSignIn);
  const verify = useAccount((s) => s.verify);
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string>();
  const a = t.account;
  const errText = (e: any) => (a.errors as Record<string, string>)[e?.code] || e?.message || a.errors.server;
  const national = lebaneseMobileNational(phone);

  const send = async () => {
    if (!national) { setError(a.errors.phone); return; }
    setBusy(true); setError(null);
    try {
      const r = await startSignIn(phone, lang);
      setDevCode(r.devCode);
      setStep("code"); setCode("");
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  const check = async (value = code) => {
    if (value.length !== 6) { setError(a.errors.code); return; }
    setBusy(true); setError(null);
    try { await verify(phone, value, name.trim()); onDone?.(); }
    catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };

  const field = "h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink outline-none focus:border-ink";
  const button = "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand font-semibold text-white hover:bg-brand-600 disabled:opacity-50";

  return (
    <div className="space-y-3" data-testid="sign-in-form">
      {step === "phone" ? (
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="signin-phone">{a.phone}</label>
            <div dir="ltr" className="flex h-12 overflow-hidden rounded-xl border border-line bg-surface focus-within:border-ink">
              <span className="grid place-items-center border-e border-line bg-paper px-3 text-sm font-medium text-muted">+961</span>
              <input id="signin-phone" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} placeholder="03 123 456"
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s+()-]/g, "").slice(0, 20))} className="w-0 min-w-0 flex-1 px-3 text-ink outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="signin-name">{a.yourName}</label>
            <input id="signin-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={field} />
          </div>
          <button type="submit" disabled={busy} className={button} data-testid="signin-send">
            <MessageCircle className="h-4 w-4" /> {busy ? a.sending : a.sendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void check(); }} className="space-y-3">
          <p className="text-sm text-muted">{fill(a.codeSent, { phone: national ? formatLebaneseMobile(national) : phone })}</p>
          {devCode && <p className="rounded-lg bg-paper-2 px-3 py-2 text-xs text-muted" dir="ltr">Test mode, code: <b className="text-ink">{devCode}</b></p>}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="signin-code">{a.code}</label>
            <input
              id="signin-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} placeholder="••••••"
              onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); if (v.length === 6) void check(v); }}
              className={`${field} text-center font-display text-3xl tracking-[0.5em]`}
              data-testid="signin-code"
            />
          </div>
          <button type="submit" disabled={busy || code.length !== 6} className={button} data-testid="signin-verify">{busy ? a.verifying : a.verify}</button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => { setStep("phone"); setError(null); }} className="font-semibold text-muted hover:text-ink">{a.changeNumber}</button>
            <button type="button" onClick={() => void send()} disabled={busy} className="font-semibold text-brand-700 hover:underline">{a.resend}</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">{error}</p>}
    </div>
  );
}
