import Link from "next/link";
import { getMessages } from "@/lib/i18n";

/** No params here (Next renders it outside the segment), so it speaks both languages. */
export default function NotFound() {
  const en = getMessages("en");
  const ar = getMessages("ar");
  return (
    <div className="mx-auto max-w-md px-4 pb-20 pt-[calc(8rem+env(safe-area-inset-top))] text-center">
      <p className="font-display text-8xl leading-none text-brand">404</p>
      <h1 className="mt-4 font-display text-3xl text-ink">{en.errorPage.notFound}</h1>
      <p className="mt-1 text-muted" dir="rtl" lang="ar">{ar.errorPage.notFound}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/en" className="inline-flex h-12 items-center rounded-full bg-ink px-6 font-semibold text-cream hover:bg-ink-2">{en.errorPage.home}</Link>
        <Link href="/ar" className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 font-semibold text-ink hover:border-ink" dir="rtl" lang="ar">{ar.errorPage.home}</Link>
      </div>
    </div>
  );
}
