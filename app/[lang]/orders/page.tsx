import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MyOrders } from "@/components/MyOrders";
import { getMessages, hasLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/orders">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: getMessages(lang).meta.ordersTitle, robots: { index: false } };
}

export default async function OrdersPage({ params }: PageProps<"/[lang]/orders">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <MyOrders lang={lang} t={getMessages(lang)} />;
}
