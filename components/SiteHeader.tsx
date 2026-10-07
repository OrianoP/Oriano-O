"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Phone, Receipt, ShoppingBag } from "lucide-react";
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
  const tel = `tel:${phone.replace(/\s/g, "")}`;

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
        <Link href={`/${lang}`} className="shrink-0 rounded-md bg-[#040706] px-2 py-1.5 sm:px-2.5" aria-label="Oriano Pizza — home">
          <Image src="/logo.png" alt="Oriano Pizza" width={1284} height={371} priority className="h-6 w-auto sm:h-7" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-2">
          <Link href={`/${lang}#menu`} className="hover:text-ink">{t.nav.menu}</Link>
          <Link href={`/${lang}/orders`} className="hover:text-ink">{t.nav.myOrders}</Link>
        </nav>

        <div className="ms-auto flex items-center gap-0.5 sm:gap-2">
          {/* Phones: icon shortcuts for "My orders" and calling the shop (the call icon drops below 360px; the hero has a call button). */}
          <Link
            href={`/${lang}/orders`}
            className="grid h-11 w-10 place-items-center rounded-md text-ink-2 hover:bg-paper-2 hover:text-ink md:hidden"
            aria-label={t.nav.myOrders}
            title={t.nav.myOrders}
          >
            <Receipt className="h-5 w-5" />
          </Link>
          <a
            href={tel}
            className="grid h-11 w-10 place-items-center rounded-md text-ink-2 hover:bg-paper-2 hover:text-ink max-[359px]:hidden sm:hidden"
            aria-label={`${t.nav.call} ${phone}`}
            title={phone}
          >
            <Phone className="h-5 w-5" />
          </a>
          <a
            href={tel}
            className="hidden sm:inline-flex items-center gap-2 h-11 px-3 rounded-md text-sm font-medium text-ink-2 hover:bg-paper-2"
            dir="ltr"
          >
            <Phone className="h-4 w-4" /> {phone}
          </a>
          <Link
            href={switchHref}
            onClick={() => { document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`; }}
            className="inline-flex items-center h-11 px-2 sm:px-3 rounded-md text-sm font-medium text-ink-2 hover:bg-paper-2"
            hrefLang={other}
            lang={other}
          >
            {t.nav.language}
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative ms-1 inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white hover:bg-ink-2 sm:ms-0 sm:px-4"
            aria-label={`${t.cart.title} (${count})`}
          >
            <ShoppingBag className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t.cart.title}</span>
            {count > 0 && (
              <span className="absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold tabular-nums ring-2 ring-paper sm:static sm:ring-0">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
