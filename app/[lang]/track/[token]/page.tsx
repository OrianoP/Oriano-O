import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { notFound } from "next/navigation";
import { OrderTracker } from "@/components/OrderTracker";
import { PosError, trackOrder } from "@/lib/pos";
import { getMessages, hasLocale } from "@/lib/i18n";
import type { TrackedOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/track/[token]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  // Tracking links are private — keep them out of search engines.
  return { title: getMessages(lang).meta.trackTitle, robots: { index: false, follow: false }, alternates: { canonical: null } };
}

export default async function TrackPage({ params }: PageProps<"/[lang]/track/[token]">) {
  const { lang, token } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getMessages(lang);

  // Only a real 404 means "no such order"; anything else (POS asleep, timeout) keeps the page trying.
  let order: TrackedOrder | null = null;
  let missing = !/^[A-Za-z0-9_-]{16,64}$/.test(token);
  if (!missing) {
    try {
      order = await trackOrder(token);
    } catch (e) {
      if (e instanceof PosError && e.status === 404) missing = true;
    }
  }

  const top = "pt-[calc(5.5rem+env(safe-area-inset-top))]";
  if (missing) {
    return (
      <div className={`mx-auto max-w-md px-4 py-20 text-center ${top}`}>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-paper-2 text-muted"><SearchX className="h-7 w-7" /></span>
        <h1 className="mt-5 font-display text-3xl text-ink">{t.track.notFound}</h1>
        <p className="mt-2 text-muted">{t.track.notFoundHint}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/${lang}/orders`} className="inline-flex h-12 items-center rounded-full bg-ink px-6 font-semibold text-cream hover:bg-ink-2">{t.nav.myOrders}</Link>
          <Link href={`/${lang}`} className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 font-semibold text-ink hover:border-ink">{t.checkout.back}</Link>
        </div>
      </div>
    );
  }
  return (
    <div className={`paper-grain ${top}`}>
      <OrderTracker token={token} initial={order} lang={lang} t={t} />
    </div>
  );
}
