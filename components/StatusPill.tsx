import type { ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";

/** Open / closed / paused indicator. */
export function StatusPill({ config, t, preview }: { config: ShopConfig; t: Messages; preview?: boolean }) {
  const tone = preview ? "amber" : config.open ? "open" : "closed";
  const label = preview ? t.status.preview : config.open ? t.status.open : config.reason === "paused" ? t.status.paused : t.status.closed;
  const hint = !preview && !config.open ? (config.reason === "paused" && config.message ? config.message : t.status.closedHint) : null;
  return (
    <div className="inline-flex items-start gap-2.5 text-sm">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone === "open" ? "bg-basil shadow-[0_0_0_4px_rgb(31_122_58_/_0.15)]" : tone === "amber" ? "bg-amber-500" : "bg-brand"}`}
        aria-hidden
      />
      <span>
        <span className="font-semibold text-ink">{label}</span>
        {hint && <span className="block text-muted">{hint}</span>}
      </span>
    </div>
  );
}
