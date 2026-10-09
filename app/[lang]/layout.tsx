import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Bricolage_Grotesque, Fraunces, IBM_Plex_Sans_Arabic, Oswald } from "next/font/google";
import "../globals.css";
import { LOCALES, getMessages, hasLocale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { getConfigSafe, getMenuSafe } from "@/lib/pos";
import { cartSuggestions } from "@/lib/menu";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { AccountSheet } from "@/components/AccountSheet";
import { MotionProvider } from "@/components/motion";

// Oswald is cut from Alternate Gothic, the condensed gothic of New York street and subway signage:
// bold and tight without being a novelty face. An italic serif for the human touch, Inter for reading, Plex Arabic for Arabic.
const display = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display-face", display: "swap" });
const serif = Fraunces({ subsets: ["latin"], style: ["italic"], weight: ["400", "500"], variable: "--font-serif-face", display: "swap" });
// Body text: a warm grotesque with a bit of hand-made character (pairs with Oswald headlines).
const inter = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic-face", display: "swap" });

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getMessages(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: `%s · Oriano Pizza` },
    description: t.meta.description,
    applicationName: "Oriano Pizza",
    keywords: [
      "New York style pizza Lebanon", "NY pizza Lebanon", "pizza Zouk Mikael", "pizza delivery Zouk Mikael",
      "pizza Jounieh", "pizza Kaslik", "best pizza Lebanon", "Oriano Pizza",
      "بيتزا نيويورك لبنان", "بيتزا ذوق مكايل", "توصيل بيتزا",
    ],
    alternates: {
      canonical: `/${lang}`,
      languages: { en: "/en", ar: "/ar", "x-default": "/en" },
    },
    openGraph: {
      type: "website",
      siteName: "Oriano Pizza",
      title: t.meta.title,
      description: t.meta.description,
      locale: lang === "ar" ? "ar_LB" : "en_LB",
      url: `/${lang}`,
    },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description },
    icons: {
      icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/favicon-64.png", sizes: "64x64", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: "/apple-touch-icon.png",
    },
    formatDetection: { telephone: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0908",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getMessages(lang);
  const [config, menu] = await Promise.all([getConfigSafe(), getMenuSafe()]);

  return (
    <html lang={lang} dir={t.dir} data-scroll-behavior="smooth" className={`${display.variable} ${serif.variable} ${inter.variable} ${arabic.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <MotionProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
            {t.nav.menu}
          </a>
          <SiteHeader lang={lang} t={t} config={config} />
          <main id="main" className="flex-1">{children}</main>
          <SiteFooter lang={lang} t={t} config={config} />
          <CartDrawer lang={lang} t={t} suggestions={cartSuggestions(menu)} />
          <AccountSheet lang={lang} t={t} zones={config?.zones ?? []} />
        </MotionProvider>
      </body>
    </html>
  );
}
