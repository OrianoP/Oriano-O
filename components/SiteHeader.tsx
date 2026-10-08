"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Phone, ReceiptText, ShoppingBag } from "lucide-react";
import { cartCount, cartSubtotal, useCart } from "@/lib/cart";
import { money } from "@/lib/menu";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";
import type { ShopConfig } from "@/lib/types";
import { spring } from "./motion";

export function SiteHeader({ lang, t, config }: { lang: Locale; t: Messages; config: ShopConfig | null }) {
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const count = mounted ? cartCount(lines) : 0;
  const subtotal = mounted ? cartSubtotal(lines) : 0;

  const other = t.nav.languageHref;
  const switchHref = pathname ? pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${other}`) : `/${other}`;
  const phone = config?.shopPhone || "+961 3 515 078";
  const isHome = pathname === `/${lang}`;

  const link = "relative text-[13px] font-semibold uppercase tracking-[0.14em] text-cream-2 hover:text-cream transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-start after:scale-x-0 after:bg-yolk after:transition-transform hover:after:scale-x-100";

  return (
    <header className={`fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-300 ${scrolled || !isHome ? "bg-coal/85 backdrop-blur-md shadow-[0_1px_0_rgb(255_255_255/0.06)]" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href={`/${lang}`} className="shrink-0" aria-label={t.nav.home}>
          <Image src="/logo.png" alt="Oriano Pizza" width={1284} height={371} priority className="h-8 w-auto sm:h-9" />
        </Link>

        <nav className="ms-8 hidden items-center gap-7 md:flex">
          <Link href={`/${lang}#menu`} className={link}>{t.nav.menu}</Link>
          <Link href={`/${lang}#picks`} className={link}>{t.nav.bestSellers}</Link>
          <Link href={`/${lang}/orders`} className={link}>{t.nav.myOrders}</Link>
        </nav>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <Link href={`/${lang}/orders`} className="grid h-11 w-11 place-items-center rounded-full text-cream-2 hover:bg-white/10 hover:text-cream md:hidden" aria-label={t.nav.myOrders}>
            <ReceiptText className="h-5 w-5" />
          </Link>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-cream-2 hover:bg-white/10 hover:text-cream sm:inline-flex"
            dir="ltr"
          >
            <Phone className="h-4 w-4" /> <span className="hidden lg:inline">{phone}</span>
          </a>
          <Link
            href={switchHref}
            onClick={() => { document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`; }}
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-3.5 text-sm font-semibold text-cream hover:border-white/40"
            hrefLang={other}
            lang={other}
          >
            {t.nav.language}
          </Link>
          <motion.button
            onClick={() => setOpen(true)}
            whileTap={{ scale: 0.96 }}
            className={`relative inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold sm:px-4 ${count > 0 ? "bg-brand text-white shadow-glow" : "border border-white/15 text-cream hover:border-white/40"}`}
            aria-label={`${t.cart.title} (${count})`}
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            <span className="hidden sm:inline">{count > 0 ? money(subtotal) : t.cart.title}</span>
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={spring}
                  className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-yolk px-1 text-[11px] font-bold tabular-nums text-coal sm:static sm:ms-1 sm:bg-white/20 sm:text-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
