import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getConfigFresh, getMenu, PREVIEW_MODE } from "@/lib/pos";
import { getMessages, hasLocale } from "@/lib/i18n";

// Always check live open/closed status and zones at checkout.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: getMessages(lang).meta.checkoutTitle, robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[lang]/checkout">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [menu, config] = await Promise.all([getMenu(), getConfigFresh()]);
  return <CheckoutForm menu={menu} config={config} lang={lang} t={getMessages(lang)} preview={PREVIEW_MODE} />;
}
