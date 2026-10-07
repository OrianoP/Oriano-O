import Image from "next/image";
import Link from "next/link";
import { Camera, MapPin, MessageCircle, Phone, Receipt } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";
import type { ShopConfig } from "@/lib/types";
import { INSTAGRAM_URL, MAPS_URL } from "@/lib/site";

export function SiteFooter({ lang, t, config }: { lang: Locale; t: Messages; config: ShopConfig | null }) {
  const phone = config?.shopPhone || "+961 3 515 078";
  const whatsapp = config?.whatsapp || "9613515078";
  const hours = config?.openingHours;
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday → Sunday
  const link = "inline-flex min-h-11 items-center gap-2 hover:text-ink sm:min-h-8";

  return (
    <footer className="mt-12 sm:mt-20 border-t border-line bg-paper-2">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12 grid gap-8 sm:gap-10 sm:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="inline-block rounded-md bg-[#040706] px-3 py-2">
            <Image src="/logo.png" alt="Oriano Pizza" width={1284} height={371} className="h-8 w-auto" />
          </div>
          <p className="max-w-xs text-muted">{t.footer.tagline}</p>
          <Link href={`/${lang}/orders`} className={`${link} text-sm font-medium text-ink-2`}>
            <Receipt className="h-4 w-4 text-muted" />{t.nav.myOrders}
          </Link>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink mb-4">{t.footer.hours}</h2>
          {hours && (
            <ul className="space-y-1.5 text-sm">
              {order.map((d) => {
                const h = hours[String(d)];
                return (
                  <li key={d} className="flex justify-between gap-6 max-w-64 text-muted">
                    <span>{t.days[d]}</span>
                    <span className="tabular-nums text-ink-2" dir="ltr">{!h || h.closed ? t.footer.closedDay : `${h.open} – ${h.close}`}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink mb-4">{t.footer.contact}</h2>
          {/* 44px rows on phones so each link is an easy tap. */}
          <ul className="-my-2 text-sm text-ink-2 sm:my-0 sm:space-y-0.5">
            <li><a href={MAPS_URL} target="_blank" rel="noreferrer" className={link}><MapPin className="h-4 w-4 text-muted" />{t.footer.address}</a></li>
            <li><a href={`tel:${phone.replace(/\s/g, "")}`} className={link} dir="ltr"><Phone className="h-4 w-4 text-muted" />{phone}</a></li>
            <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className={link}><MessageCircle className="h-4 w-4 text-muted" />WhatsApp</a></li>
            {INSTAGRAM_URL && <li><a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className={link}><Camera className="h-4 w-4 text-muted" />Instagram</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-xs text-muted">
          © {new Date().getFullYear()} Oriano Pizza · {t.footer.address}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
