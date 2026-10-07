"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Phone, ShoppingBag } from "lucide-react";
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
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href={`/${lang}`} className="shrink-0 rounded-md bg-[#040706] px-2.5 py-1.5" aria-label="Oriano Pizza — home">
          <Image src="/logo.png" alt="Oriano Pizza" width={1284} height={371} priority className="h-7 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-2">
          <Link href={`/${lang}#menu`} className="hover:text-ink">{t.nav.menu}</Link>
          <Link href={`/${lang}/orders`} className="hover:text-ink">{t.nav.myOrders}</Link>
        </nav>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="hidden sm:inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm font-medium text-ink-2 hover:bg-paper-2"
            dir="ltr"
          >
            <Phone className="h-4 w-4" /> {phone}
          </a>
          <Link
            href={switchHref}
            onClick={() => { document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`; }}
            className="inline-flex items-center h-10 px-3 rounded-md text-sm font-medium text-ink-2 hover:bg-paper-2"
            hrefLang={other}
            lang={other}
          >
            {t.nav.language}
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative inline-flex items-center gap-2 h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-2"
            aria-label={`${t.cart.title} (${count})`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">{t.cart.title}</span>
            {count > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold tabular-nums">{count}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
