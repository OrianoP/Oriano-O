import Image from "next/image";
import Link from "next/link";
import { Camera, MapPin, MessageCircle, Phone } from "lucide-react";
import { formatClock, type Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";
import type { ShopConfig } from "@/lib/types";
import { INSTAGRAM_URL, MAPS_URL } from "@/lib/site";

export function SiteFooter({ lang, t, config }: { lang: Locale; t: Messages; config: ShopConfig | null }) {
  const phone = config?.shopPhone || "+961 3 515 078";
  const whatsapp = config?.whatsapp || "9613515078";
  const hours = config?.openingHours && Object.keys(config.openingHours).length ? config.openingHours : null;
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday → Sunday
  const item = "inline-flex min-h-11 items-center gap-2.5 text-cream-2 hover:text-cream";

  return (
    <footer className="oven-glow relative mt-24 text-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Image src="/logo-mark.png" alt="Oriano Pizza" width={1216} height={360} className="h-10 w-auto" />
            <p className="mt-5 max-w-sm text-cream-2">{t.footer.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">
                <MessageCircle className="h-4 w-4" /> {t.footer.orderOnWhatsApp}
              </a>
              <a href={MAPS_URL} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold hover:border-white/40">
                <MapPin className="h-4 w-4" /> {t.footer.directions}
              </a>
            </div>
          </div>

          <div>
            <h2 className="font-display text-sm tracking-[0.18em] text-yolk">{t.footer.hours}</h2>
            {hours ? (
              <ul className="mt-4 space-y-1.5 text-sm">
                {order.map((d) => {
                  const h = hours[String(d)];
                  return (
                    <li key={d} className="flex max-w-64 justify-between gap-6 text-cream-2">
                      <span>{t.days[d]}</span>
                      <span className="tabular-nums text-cream" dir="ltr">{!h || h.closed ? t.footer.closedDay : `${formatClock(h.open, lang)} – ${formatClock(h.close, lang)}`}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-cream-2">{t.footer.hoursUnknown}</p>
            )}
          </div>

          <div>
            <h2 className="font-display text-sm tracking-[0.18em] text-yolk">{t.footer.contact}</h2>
            <ul className="mt-3 text-sm">
              <li><a href={MAPS_URL} target="_blank" rel="noreferrer" className={item}><MapPin className="h-4 w-4 text-cream-2/70" />{t.footer.address}</a></li>
              <li><a href={`tel:${phone.replace(/\s/g, "")}`} className={item} dir="ltr"><Phone className="h-4 w-4 text-cream-2/70" />{phone}</a></li>
              <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className={item}><MessageCircle className="h-4 w-4 text-cream-2/70" />WhatsApp</a></li>
              {INSTAGRAM_URL && <li><a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className={item}><Camera className="h-4 w-4 text-cream-2/70" />Instagram</a></li>}
              <li><Link href={`/${lang}/orders`} className={item}>{t.nav.myOrders}</Link></li>
              <li><Link href={`/${lang}/privacy`} className={item}>{t.nav.privacy}</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-cream-2/80 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Oriano Pizza · {t.footer.address}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
