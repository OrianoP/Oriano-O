import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Barlow_Condensed, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "../globals.css";
import { LOCALES, getMessages, hasLocale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { getConfig } from "@/lib/pos";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";

// Condensed headings (New York signage feel), Inter for reading, Plex Arabic for Arabic.
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display-face", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
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
      icon: [{ url: "/favicon-64.png", sizes: "64x64", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: "/apple-touch-icon.png",
    },
    formatDetection: { telephone: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getMessages(lang);
  const config = await getConfig().catch(() => null);

  return (
    <html lang={lang} dir={t.dir} className={`${display.variable} ${inter.variable} ${arabic.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <a href="#menu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-md">
          {t.nav.menu}
        </a>
        <SiteHeader lang={lang} t={t} config={config} />
        <main className="flex-1">{children}</main>
        <SiteFooter lang={lang} t={t} config={config} />
        <CartDrawer lang={lang} t={t} />
      </body>
    </html>
  );
}
