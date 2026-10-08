"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, MapPin, Search, X } from "lucide-react";
import { searchAreas } from "@/lib/areaSearch";
import { money } from "@/lib/menu";
import { fill, type Locale } from "@/lib/i18n";
import type { Zone } from "@/lib/types";
import type { Messages } from "@/messages/en";

/**
 * Type-ahead for the delivery area. Typing shows the matching areas with
 * their fee ("junie" finds Jounieh, Arabic works too); tapping one picks it
 * and the fee is added to the order. Only listed areas can be chosen.
 */
export function AreaPicker({ zones, value, onChange, lang, t, invalid, id }: {
  zones: Zone[]; value: number | null; onChange: (zoneId: number | null) => void; lang: Locale; t: Messages; invalid?: boolean; id: string;
}) {
  const listId = useId();
  const selected = zones.find((z) => z.id === value) ?? null;
  const label = (z: Zone) => (lang === "ar" && z.nameAr ? z.nameAr : z.name);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (q.trim() ? searchAreas(zones, q) : zones).slice(0, 8), [zones, q]);
  useEffect(() => setHi(0), [q]);
  useEffect(() => {
    const close = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const pick = (z: Zone) => { onChange(z.id); setQ(""); setOpen(false); input.current?.blur(); };

  if (selected && !open) {
    return (
      <div className={`flex min-h-12 items-center gap-3 rounded-xl border-2 bg-surface px-3 py-2 ${invalid ? "border-brand" : "border-ink"}`} data-testid="area-selected">
        <MapPin className="h-5 w-5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink">{label(selected)}</div>
          <div className="text-xs text-muted">{fill(t.checkout.areaFee, { fee: money(selected.fee) })}</div>
        </div>
        <button type="button" onClick={() => { setOpen(true); setTimeout(() => input.current?.focus(), 0); }} className="h-9 rounded-full border border-line px-3 text-sm font-semibold text-ink hover:border-ink" data-testid="area-change">
          {t.checkout.changeArea}
        </button>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <div className={`flex h-12 items-center gap-2 rounded-xl border bg-surface px-3 focus-within:border-ink ${invalid ? "border-brand" : "border-line"}`}>
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          ref={input} id={id} value={q} autoComplete="off" autoCorrect="off" spellCheck={false}
          role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          placeholder={t.checkout.searchArea}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); if (results[hi]) pick(results[hi]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          className="h-full w-0 min-w-0 flex-1 bg-transparent text-ink outline-none"
          style={{ outline: "none" }} /* the box around it already shows focus */
          data-testid="area-search"
        />
        {q && <button type="button" onClick={() => { setQ(""); input.current?.focus(); }} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-ink" aria-label="Clear"><X className="h-4 w-4" /></button>}
      </div>
      {open && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-lift" data-testid="area-results">
          {results.map((z, i) => (
            <li key={z.id} role="option" aria-selected={i === hi}>
              <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => pick(z)} onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start ${i === hi ? "bg-paper-2" : ""}`} data-testid="area-option">
                <MapPin className="h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{label(z)}</span>
                  {(lang === "ar" ? z.name : z.nameAr) && <span className="block truncate text-xs text-muted" dir="auto">{lang === "ar" ? z.name : z.nameAr}</span>}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{money(z.fee)}</span>
                {z.id === value && <Check className="h-4 w-4 shrink-0 text-basil" />}
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-3 text-sm text-muted">{fill(t.checkout.noArea, { q: q.trim() })}</li>}
        </ul>
      )}
    </div>
  );
}
