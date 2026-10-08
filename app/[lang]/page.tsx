import { notFound } from "next/navigation";
import Image from "next/image";
import { Hero } from "@/components/Hero";
import { MenuBrowser } from "@/components/MenuBrowser";
import { Item, Parallax, Pop, Reveal, Stagger } from "@/components/motion";
import { pagePhoto, withPhotos } from "@/lib/photos";
import { getSiteData, PREVIEW_MODE } from "@/lib/pos";
import { getMessages, hasLocale } from "@/lib/i18n";
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
    image: `${SITE_URL}/${lang}/opengraph-image`,
    telephone: config.shopPhone.replace(/\s/g, ""),
    servesCuisine: ["Pizza", "New York style pizza", "American"],
    priceRange: "$$",
    currenciesAccepted: "USD, LBP",
    paymentAccepted: "Cash",
    hasMap: MAPS_URL,
    address: { "@type": "PostalAddress", addressLocality: ADDRESS.locality, addressRegion: ADDRESS.region, addressCountry: ADDRESS.country },
    areaServed: config.zones.map((z) => z.name),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
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
          ...(p.imageUrl ? { image: `${SITE_URL}${p.imageUrl}` } : {}),
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
  const { menu: rawMenu, config } = await getSiteData();
  const menu = withPhotos(rawMenu);
  const hero = pagePhoto("hero");
  const story = pagePhoto("story") || menu.products.find((p) => p.name === "Pepperoni Overload Ranch")?.imageUrl || hero;

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so menu text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(menu, config, lang)).replace(/</g, "\\u003c") }}
      />

      <Hero t={t} lang={lang} config={config} preview={PREVIEW_MODE} photo={hero} />

      {/* The light world: browse and order */}
      <div className="paper-grain bg-paper">
        <MenuBrowser menu={menu} config={config} lang={lang} t={t} />
      </div>

      {/* Story */}
      <section className="oven-glow relative overflow-hidden text-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          <Reveal>
            <p className="font-display text-sm tracking-[0.22em] text-yolk">{t.story.eyebrow}</p>
            <h2 className="mt-3 font-display text-[clamp(3rem,9vw,6.5rem)] leading-[0.9]">{t.story.title}</h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream-2">{t.story.body}</p>
            <Stagger className="mt-10 grid gap-6 sm:grid-cols-3" gap={0.12}>
              {t.story.facts.map(([big, small], i) => (
                <Item key={i} className="border-s-2 border-brand ps-4">
                  <Pop className="block font-display text-5xl leading-none text-yolk" delay={0.1 * i}>{big}</Pop>
                  <span className="mt-2 block text-sm text-cream-2">{small}</span>
                </Item>
              ))}
            </Stagger>
          </Reveal>
          {story && (
            <Reveal delay={0.1}>
              <Parallax amount={50} className="relative aspect-[4/5] overflow-hidden rounded-[32px] ring-1 ring-white/10 sm:aspect-square">
                <Image src={story} alt="" fill sizes="(max-width: 1024px) 100vw, 600px" className="scale-[1.15] object-cover" />
              </Parallax>
            </Reveal>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="paper-grain bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <p className="font-display text-sm tracking-[0.2em] text-brand">{t.how.eyebrow}</p>
          </Reveal>
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.08}>
            {t.how.steps.map(([title, body], i) => (
              <Item key={i} className="rounded-3xl border border-line bg-surface p-6">
                <span className="font-display text-5xl leading-none text-brand">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 font-display text-2xl leading-none text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </Item>
            ))}
          </Stagger>
          <Reveal className="mt-16 max-w-3xl">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">{t.seo.heading}</h2>
            {t.seo.body.map((p, i) => <p key={i} className="mt-4 leading-relaxed text-muted">{p}</p>)}
          </Reveal>
        </div>
      </section>
    </>
  );
}
