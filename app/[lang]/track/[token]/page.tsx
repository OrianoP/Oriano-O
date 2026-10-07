import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { notFound } from "next/navigation";
import { OrderTracker } from "@/components/OrderTracker";
import { trackOrder } from "@/lib/pos";
import { getMessages, hasLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/track/[token]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  // Tracking links are private — keep them out of search engines.
  return { title: getMessages(lang).meta.trackTitle, robots: { index: false, follow: false } };
}

export default async function TrackPage({ params }: PageProps<"/[lang]/track/[token]">) {
  const { lang, token } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getMessages(lang);
  const order = /^[A-Za-z0-9_-]{16,64}$/.test(token) ? await trackOrder(token).catch(() => null) : null;

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <SearchX className="mx-auto h-10 w-10 text-line-strong" />
        <p className="mt-4 text-ink">{t.track.notFound}</p>
        <Link href={`/${lang}`} className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-6 font-semibold text-white hover:bg-brand-600">{t.checkout.back}</Link>
      </div>
    );
  }
  return <OrderTracker token={token} initial={order} lang={lang} t={t} />;
}
