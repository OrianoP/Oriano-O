import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Banknote, Clock, Phone, Store } from "lucide-react";
import { MenuBrowser } from "@/components/MenuBrowser";
import { StatusPill } from "@/components/StatusPill";
import { pagePhoto, withPhotos } from "@/lib/photos";
import { getConfigSafe, getMenuSafe, PREVIEW_MODE } from "@/lib/pos";
import { getMessages, hasLocale, term } from "@/lib/i18n";
import { cleanDescription } from "@/lib/menu";
import { ADDRESS, MAPS_URL, SITE_URL } from "@/lib/site";
import type { Menu, ShopConfig } from "@/lib/types";

// Menu and shop status refresh from the POS in the background.
export const revalidate = 60;

function jsonLd(menu: Menu, config: ShopConfig, lang: string) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hours = Object.entries(config.openingHours)
    .filter(([, h]) => !h.closed)
    .map(([d, h]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${days[Number(d)]}`,
      opens: h.open,
      closes: h.close === "00:00" ? "23:59" : h.close,
    }));
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE_URL}/#restaurant`,
    name: "Oriano Pizza",
    alternateName: "أوريانو بيتزا",
    description: "Lebanon's first authentic New York style pizzeria.",
    url: `${SITE_URL}/${lang}`,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/icon-512.png`,
    telephone: config.shopPhone.replace(/\s/g, ""),
    servesCuisine: ["Pizza", "New York style pizza", "American"],
    priceRange: "$$",
    currenciesAccepted: "USD, LBP",
    paymentAccepted: "Cash",
    hasMap: MAPS_URL,
    address: { "@type": "PostalAddress", addressLocality: ADDRESS.locality, addressRegion: ADDRESS.region, addressCountry: ADDRESS.country },
    areaServed: config.zones.map((z) => z.name),
    openingHoursSpecification: hours,
    potentialAction: {
      "@type": "OrderAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/${lang}`, inLanguage: lang, actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"] },
      deliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet", "http://purl.org/goodrelations/v1#DeliveryModePickUp"],
    },
    hasMenu: {
      "@type": "Menu",
      name: "Oriano Pizza menu",
      hasMenuSection: menu.categories.map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: menu.products.filter((p) => p.categoryId === c.id).map((p) => ({
          "@type": "MenuItem",
          name: p.name,
          description: cleanDescription(p.description) || undefined,
          offers: (p.sizes.length ? p.sizes : [{ name: undefined, price: p.basePrice }]).map((s) => ({
            "@type": "Offer",
            ...(s.name ? { name: s.name } : {}),
            price: s.price.toFixed(2),
            priceCurrency: "USD",
          })),
        })),
      })),
    },
  };
}

/** Today's hours in Beirut, e.g. "12:00 – 23:30", or null if closed today. */
function todayHours(config: ShopConfig) {
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Beirut", weekday: "short" }).format(new Date()),
  );
  const h = config.openingHours[String(day)];
  return !h || h.closed ? null : `${h.open} – ${h.close}`;
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getMessages(lang);
  const [rawMenu, config] = await Promise.all([getMenuSafe(), getConfigSafe()]);
  const menu = withPhotos(rawMenu);
  const hero = pagePhoto("hero");
  const story = pagePhoto("story");
  const hours = todayHours(config);
  const tel = `tel:${config.shopPhone.replace(/\s/g, "")}`;

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so menu text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(menu, config, lang)).replace(/</g, "\\u003c") }}
      />

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-16 grid gap-6 sm:gap-10 lg:grid-cols-[1.1fr_1fr] items-center">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-brand">{t.hero.badge}</p>
            <h1 className="mt-3 sm:mt-4 font-display font-extrabold uppercase leading-[0.92] text-[2.6rem] sm:text-7xl text-ink rtl:leading-[1.2] rtl:normal-case rtl:text-[2.2rem] sm:rtl:text-7xl">
              {t.hero.titleA}
              <span className="block text-ink-2">{t.hero.titleB}</span>
            </h1>
            <p className="mt-3 sm:mt-5 max-w-md text-base sm:text-lg leading-relaxed text-muted">{t.hero.subtitle}</p>
            <div className="mt-5 sm:mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
              <a href="#menu" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand px-3 sm:px-6 text-[15px] font-semibold text-white hover:bg-brand-600">
                {t.hero.order} <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" />
              </a>
              <a href={tel} className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line-strong bg-surface px-3 sm:px-5 text-[15px] font-semibold text-ink hover:border-ink">
                <Phone className="h-4 w-4 shrink-0" /> {t.hero.callToOrder}
              </a>
            </div>
            <div className="mt-4 sm:mt-6">
              <StatusPill config={config} t={t} preview={PREVIEW_MODE} />
            </div>
          </div>

          {hero ? (
            <div className="relative aspect-[16/10] lg:aspect-[3/2] overflow-hidden rounded-xl bg-paper-2 shadow-lift">
              <Image src={hero} alt="Oriano Pizza" fill priority sizes="(max-width: 1024px) 100vw, 540px" className="object-cover" />
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 shadow-soft">
              <div className="inline-block rounded-md bg-[#040706] px-4 py-3">
                <Image src="/logo.png" alt="Oriano Pizza" width={1284} height={371} className="h-12 w-auto" priority />
              </div>
              <p className="mt-6 font-display text-sm font-bold uppercase tracking-[0.16em] text-muted">{t.hero.sizesTitle}</p>
              <dl className="mt-2 divide-y divide-line">
                {t.hero.sizes.map(([name, size]) => (
                  <div key={name} className="flex items-baseline justify-between py-3">
                    <dt className="font-display text-2xl font-bold uppercase text-ink rtl:normal-case">{name}</dt>
                    <dd className="text-muted">{size}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-muted">{t.hero.first}.</p>
            </div>
          )}
        </div>

        <div className="border-t border-line bg-surface">
          {/* Phones: a compact three-column row (icon above two short lines). sm+: icon beside text. */}
          <dl className="mx-auto max-w-6xl px-2 sm:px-6 grid grid-cols-3 divide-x divide-line">
            <div className="flex flex-col items-center gap-1.5 px-2 py-3 text-center sm:flex-row sm:gap-3 sm:py-4 sm:ps-0 sm:pe-6 sm:text-start">
              <Clock className="h-5 w-5 text-muted shrink-0" />
              <div className="min-w-0">
                <dt className="text-[10px] sm:text-xs uppercase tracking-wider text-muted">{hours ? t.hero.todayOpen : t.hero.todayClosed}</dt>
                <dd className="text-xs sm:text-base font-semibold text-ink tabular-nums" dir="ltr">{hours ?? "—"}</dd>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5 px-2 py-3 text-center sm:flex-row sm:gap-3 sm:py-4 sm:px-6 sm:text-start">
              <Store className="h-5 w-5 text-muted shrink-0" />
              <div className="min-w-0">
                <dt className="text-[10px] sm:text-xs uppercase tracking-wider text-muted">{t.footer.address}</dt>
                <dd className="text-xs sm:text-base font-semibold text-ink">{t.hero.service}</dd>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5 px-2 py-3 text-center sm:flex-row sm:gap-3 sm:py-4 sm:ps-6 sm:pe-0 sm:text-start">
              <Banknote className="h-5 w-5 text-muted shrink-0" />
              <div className="min-w-0">
                <dt className="text-[10px] sm:text-xs uppercase tracking-wider text-muted">{t.checkout.payment}</dt>
                <dd className="text-xs sm:text-base font-semibold text-ink">{t.hero.payment}</dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      <MenuBrowser menu={menu} config={config} lang={lang} t={t} />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-8">
        <div className={`grid gap-8 items-center rounded-xl border border-line bg-surface p-6 sm:p-10 ${story ? "lg:grid-cols-[1fr_1.1fr]" : ""}`}>
          {story && (
            <div className="relative aspect-square overflow-hidden rounded-lg bg-paper-2">
              <Image src={story} alt="" fill sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" />
            </div>
          )}
          <div className={story ? "" : "max-w-3xl"}>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-ink rtl:normal-case">{t.seo.heading}</h2>
            {t.seo.body.map((p, i) => (
              <p key={i} className="mt-4 leading-relaxed text-muted">{p}</p>
            ))}
            <p className="mt-4 text-sm text-muted">{menu.categories.map((c) => term(c.name, lang)).join(" · ")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
