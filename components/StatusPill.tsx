import { fill, formatClock, nextOpening, type Locale } from "@/lib/i18n";
import type { ShopConfig } from "@/lib/types";
import type { Messages } from "@/messages/en";

/** Open / closed / paused indicator with the next opening time. Works on dark and light. */
export function StatusPill({ config, t, lang, preview, tone = "dark" }: { config: ShopConfig; t: Messages; lang: Locale; preview?: boolean; tone?: "dark" | "light" }) {
  const state = preview ? "preview" : config.unreachable ? "unreachable" : config.open ? "open" : config.reason === "paused" ? "paused" : "closed";
  const label = state === "open" ? t.status.open : state === "paused" ? t.status.paused : state === "preview" ? t.status.preview : state === "unreachable" ? t.status.unreachable : t.status.closed;

  let hint: string | null = null;
  if (state === "closed") {
    const next = nextOpening(config.openingHours);
    hint = next
      ? next.today ? fill(t.status.opensAt, { time: formatClock(next.time, lang) }) : fill(t.status.opensOn, { day: t.days[next.day], time: formatClock(next.time, lang) })
      : t.status.closedHint;
  } else if (state === "paused") hint = config.message || t.status.pausedHint;

  const dark = tone === "dark";
  const dot = state === "open" ? "bg-basil-400 animate-pulse-dot" : state === "closed" ? "bg-cream-2" : "bg-yolk";
  return (
    <div className={`inline-flex items-start gap-2.5 text-sm ${dark ? "text-cream" : "text-ink"}`}>
      <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className={`block ${dark ? "text-cream-2" : "text-muted"}`}>{hint}</span>}
      </span>
    </div>
  );
}
