import { notFound } from "next/navigation";
import { MenuBrowser } from "@/components/MenuBrowser";
import { PizzaArt } from "@/components/FoodArt";
import { StatusPill } from "@/components/StatusPill";
import { getConfig, getMenu, PREVIEW_MODE } from "@/lib/pos";
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

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getMessages(lang);
  const [menu, config] = await Promise.all([getMenu(), getConfig()]);
  const heroPizza = menu.products.find((p) => /pepperoni/i.test(p.name) && p.itemType === "pizza") || menu.products[0];
  const heroLabel = menu.labels.find((l) => l.id === heroPizza?.labelId)?.name;

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so menu text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(menu, config, lang)).replace(/</g, "\\u003c") }}
      />

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:pt-14 sm:pb-16 grid gap-8 md:grid-cols-[1.15fr_1fr] items-center">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-yolk px-3 py-1 text-xs font-black uppercase tracking-wider text-ink">
              🗽 {t.hero.badge}
            </span>
            <h1 className="mt-4 font-display font-black leading-[0.95] rtl:leading-[1.3] text-[2.6rem] sm:text-6xl lg:text-7xl text-ink">
              {t.hero.titleA}
              <span className="block text-brand">{t.hero.titleB}</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-ink-soft">{t.hero.subtitle}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#menu" className="inline-flex h-14 items-center rounded-full bg-brand px-8 text-lg font-black text-white shadow-pop hover:bg-brand-600 active:scale-95 transition">
                {t.hero.order} <span className="inline-block ms-2 rtl:rotate-180" aria-hidden>→</span>
              </a>
              <a href={`tel:${config.shopPhone.replace(/\s/g, "")}`} className="inline-flex h-14 items-center rounded-full bg-white px-6 font-bold text-ink shadow-card hover:shadow-pop transition">
                📞 {t.hero.callToOrder}
              </a>
            </div>
            <div className="mt-5">
              <StatusPill config={config} t={t} preview={PREVIEW_MODE} />
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink-soft">
              {t.hero.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-1.5"><span className="text-brand">✔</span>{perk}</li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md aspect-square">
            <div className="absolute inset-[6%] rounded-full bg-brand" />
            <div className="absolute inset-0 rounded-full border-[10px] border-dashed border-yolk/70 animate-[spin_60s_linear_infinite]" aria-hidden />
            {heroPizza && <PizzaArt product={heroPizza} labelName={heroLabel} className="relative h-full w-full drop-shadow-2xl animate-[spin_90s_linear_infinite]" />}
            <span className="absolute -bottom-2 start-2 rotate-[-8deg] rounded-2xl bg-white px-4 py-2 font-display text-lg font-black text-ink shadow-card">
              NY XL · 45cm
            </span>
          </div>
        </div>
        <div className="checker h-4" aria-hidden />
      </section>

      <MenuBrowser menu={menu} config={config} lang={lang} t={t} />

      <section className="mx-auto max-w-3xl px-4 pt-4 pb-6 text-center">
        <h2 className="font-display text-3xl font-black text-ink">{t.seo.heading}</h2>
        {t.seo.body.map((p, i) => (
          <p key={i} className="mt-3 text-ink-soft leading-relaxed">{p}</p>
        ))}
        <p className="mt-3 text-sm text-ink-soft">{menu.categories.map((c) => term(c.name, lang)).join(" · ")}</p>
      </section>
    </>
  );
}
