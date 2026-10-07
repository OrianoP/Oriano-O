import type { ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";

/** Open / closed / paused indicator shown in the hero and checkout. */
export function StatusPill({ config, t, preview }: { config: ShopConfig; t: Messages; preview?: boolean }) {
  if (preview) {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl bg-yolk-100 px-4 py-2 text-sm font-bold text-ink">
        <span className="h-2.5 w-2.5 rounded-full bg-yolk" /> {t.status.preview}
      </div>
    );
  }
  if (config.open) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-basil shadow-card">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-basil opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-basil" />
        </span>
        {t.status.open}
      </div>
    );
  }
  return (
    <div className="inline-flex flex-col rounded-2xl bg-brand-50 border border-brand-100 px-4 py-2 text-sm text-ink">
      <span className="font-bold text-brand-700">● {config.reason === "paused" ? t.status.paused : t.status.closed}</span>
      <span className="text-ink-soft">{config.reason === "paused" && config.message ? config.message : t.status.closedHint}</span>
    </div>
  );
}
