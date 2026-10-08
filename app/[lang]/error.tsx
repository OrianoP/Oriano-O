"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { getMessages, hasLocale } from "@/lib/i18n";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ lang: string }>();
  const lang = hasLocale(params?.lang || "") ? (params.lang as "en" | "ar") : "en";
  const t = getMessages(lang);
  return (
    <div className="mx-auto max-w-md px-4 pb-20 pt-[calc(8rem+env(safe-area-inset-top))] text-center">
      <h1 className="font-display text-4xl text-ink">{t.errorPage.title}</h1>
      <p className="mt-3 text-muted">{t.errorPage.hint}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-cream hover:bg-ink-2"><RefreshCw className="h-4 w-4" /> {t.errorPage.retry}</button>
        <Link href={`/${lang}`} className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 font-semibold text-ink hover:border-ink">{t.errorPage.home}</Link>
      </div>
    </div>
  );
}
