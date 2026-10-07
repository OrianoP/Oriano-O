"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cartCount, useCart } from "@/lib/cart";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";
import type { ShopConfig } from "@/lib/types";

export function SiteHeader({ lang, t, config }: { lang: Locale; t: Messages; config: ShopConfig | null }) {
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? cartCount(lines) : 0;

  // Same page in the other language.
  const other = t.nav.languageHref;
  const switchHref = pathname ? pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${other}`) : `/${other}`;
  const phone = config?.shopPhone || "+961 3 515 078";

  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-cream-300/70">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-3">
        <Link href={`/${lang}`} className="shrink-0 rounded-xl bg-[#080808] px-3 py-1.5 shadow-card" aria-label="Oriano Pizza — home">
          <Image src="/logo.png" alt="Oriano Pizza" width={1284} height={371} priority className="h-8 w-auto" />
        </Link>

        <nav className="ms-auto flex items-center gap-1.5 sm:gap-2 text-sm font-semibold">
          <Link href={`/${lang}/orders`} className="hidden sm:inline-flex rounded-full px-3 py-2 text-ink-soft hover:text-ink hover:bg-cream-200">
            {t.nav.myOrders}
          </Link>
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="hidden sm:inline-flex rounded-full px-3 py-2 text-ink-soft hover:text-ink hover:bg-cream-200">
            {t.nav.call}
          </a>
          <Link
            href={switchHref}
            onClick={() => { document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`; }}
            className="rounded-full px-3 py-2 text-ink-soft hover:text-ink hover:bg-cream-200"
            hrefLang={other}
            lang={other}
          >
            {t.nav.language}
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-white shadow-pop hover:bg-brand-600 active:scale-95 transition"
            aria-label={`${t.cart.title} (${count})`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 7h12l-1 13H7L6 7Z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
            <span className="tabular-nums">{count}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
