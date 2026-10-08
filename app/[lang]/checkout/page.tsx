import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getSiteData, PREVIEW_MODE } from "@/lib/pos";
import { getMessages, hasLocale } from "@/lib/i18n";
import { withPhotos } from "@/lib/photos";

// Opens instantly from the cached menu and settings (refreshed every minute); the form then
// fetches the live open/closed status and delivery areas, and the POS re-checks everything on order.
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: getMessages(lang).meta.checkoutTitle, robots: { index: false }, alternates: { canonical: null } };
}

export default async function CheckoutPage({ params }: PageProps<"/[lang]/checkout">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { menu, config } = await getSiteData();
  return (
    <div className="paper-grain pt-[calc(5.5rem+env(safe-area-inset-top))]">
      <CheckoutForm menu={withPhotos(menu)} config={config} lang={lang} t={getMessages(lang)} preview={PREVIEW_MODE} />
    </div>
  );
}
