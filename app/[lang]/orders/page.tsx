import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MyOrders } from "@/components/MyOrders";
import { getMessages, hasLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/orders">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: getMessages(lang).meta.ordersTitle, robots: { index: false }, alternates: { canonical: null } };
}

export default async function OrdersPage({ params }: PageProps<"/[lang]/orders">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <div className="paper-grain pt-[calc(5.5rem+env(safe-area-inset-top))]">
      <MyOrders lang={lang} t={getMessages(lang)} />
    </div>
  );
}
