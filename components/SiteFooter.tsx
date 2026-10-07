import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/messages/en";
import type { ShopConfig } from "@/lib/types";
import { INSTAGRAM_URL, MAPS_URL } from "@/lib/site";

export function SiteFooter({ lang, t, config }: { lang: Locale; t: Messages; config: ShopConfig | null }) {
  const phone = config?.shopPhone || "+961 3 515 078";
  const whatsapp = config?.whatsapp || "9613515078";
  const hours = config?.openingHours;
  // Saturday-first is not common in Lebanon; list Monday → Sunday.
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <footer className="mt-16">
      <div className="checker h-3" aria-hidden />
      <div className="bg-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <div className="inline-block rounded-xl bg-[#080808] px-3 py-2">
              <Image src="/logo.png" alt="Oriano Pizza" width={1284} height={371} className="h-9 w-auto" />
            </div>
            <p className="font-display text-xl leading-snug">{t.footer.tagline}</p>
          </div>

          <div>
            <h2 className="font-bold uppercase tracking-wide text-yolk text-sm mb-3">{t.footer.hours}</h2>
            {hours ? (
              <ul className="space-y-1 text-sm">
                {order.map((d) => {
                  const h = hours[String(d)];
                  return (
                    <li key={d} className="flex justify-between gap-4 max-w-64">
                      <span>{t.days[d]}</span>
                      <span className="tabular-nums" dir="ltr">{!h || h.closed ? t.footer.closedDay : `${h.open} – ${h.close}`}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className="space-y-2 text-sm">
            <h2 className="font-bold uppercase tracking-wide text-yolk mb-3">{t.footer.contact}</h2>
            <p><a href={MAPS_URL} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">📍 {t.footer.address}</a></p>
            <p><a href={`tel:${phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline" dir="ltr">📞 {phone}</a></p>
            <p><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">💬 WhatsApp</a></p>
            {INSTAGRAM_URL && <p><a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">📸 Instagram</a></p>}
          </div>
        </div>
        <div className="border-t border-white/20">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/80">
            © {new Date().getFullYear()} Oriano Pizza · {t.footer.address}. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
