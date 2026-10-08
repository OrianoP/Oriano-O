"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/lib/accountStore";
import { GOOGLE_CLIENT_ID } from "@/lib/account";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";

/** Google's own "Continue with Google" button (Google Identity Services, popup mode). */
let gis: Promise<void> | null = null;
function loadGis() {
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  gis ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gis = null; reject(new Error("gis")); };
    document.head.appendChild(s);
  });
  return gis;
}

export function GoogleButton({ lang, t }: { lang: Locale; t: Messages }) {
  const box = useRef<HTMLDivElement>(null);
  const googleSignIn = useAccount((s) => s.googleSignIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onCredential = useRef<(credential: string) => void>(() => {});
  onCredential.current = async (credential) => {
    setBusy(true); setError(null);
    try { await googleSignIn(credential); }
    catch (e: any) { setError((t.account.errors as Record<string, string>)[e?.code] || t.account.errors.google); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGis().then(() => {
      const el = box.current;
      if (cancelled || !el) return;
      const id = (window as any).google.accounts.id;
      id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r: { credential?: string }) => r.credential && onCredential.current(r.credential),
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      el.innerHTML = "";
      id.renderButton(el, {
        type: "standard", theme: "outline", size: "large", shape: "pill", text: "continue_with", logo_alignment: "center",
        width: Math.max(200, Math.min(400, el.offsetWidth || 320)), locale: lang,
      });
    }).catch(() => !cancelled && setError(t.account.errors.google));
    return () => { cancelled = true; };
  }, [lang, t]);

  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <div className="space-y-2" data-testid="google-sign-in">
      <div ref={box} className={`flex min-h-11 w-full justify-center ${busy ? "pointer-events-none opacity-50" : ""}`} />
      {error && <p role="alert" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">{error}</p>}
    </div>
  );
}
