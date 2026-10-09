"use client";

import { Briefcase, Home, MapPin } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Zone } from "@/lib/types";
import type { Messages } from "@/messages/en";
import type { AddressInput } from "@/lib/accountStore";
import { AreaPicker } from "./AreaPicker";

export const LABELS = ["Home", "Work", "Other"] as const;
export const labelIcon = (label: string) => (label === "Home" ? Home : label === "Work" ? Briefcase : MapPin);
export function labelText(label: string, t: Messages) {
  return label === "Home" ? t.addresses.home : label === "Work" ? t.addresses.work : label === "Other" ? t.addresses.other : label;
}
export const zoneLabel = (z: Pick<Zone, "name" | "nameAr">, lang: Locale) => (lang === "ar" && z.nameAr ? z.nameAr : z.name);

/** "Rue Pasteur, Nour bldg, floor 3" */
export function addressSummary(a: Pick<AddressInput, "street" | "building" | "floor">, t: Messages) {
  return [a.street, a.building && `${t.checkout.building} ${a.building}`, a.floor && `${t.checkout.floor.split(" / ")[0]} ${a.floor}`].filter(Boolean).join(", ");
}

/**
 * The delivery address fields. Controlled: the parent keeps the values.
 * `errors` marks missing fields after a submit attempt.
 */
export function AddressForm({ value, onChange, zones, lang, t, errors = {}, idPrefix = "" }: {
  value: AddressInput; onChange: (v: AddressInput) => void; zones: Zone[]; lang: Locale; t: Messages;
  errors?: { zone?: boolean; street?: boolean; building?: boolean }; idPrefix?: string;
}) {
  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: k === "zoneId" ? (e.target.value ? Number(e.target.value) : null) : e.target.value });
  const label = "mb-1.5 block text-sm font-medium text-ink";
  const field = "h-12 w-full rounded-xl border bg-surface px-3 text-ink outline-none focus:border-ink";
  const err = (on?: boolean) => (on ? "border-brand" : "border-line");
  const req = (on?: boolean, id?: string) => (on ? { "data-invalid": true, "aria-invalid": true as const, "aria-describedby": id } : {});

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={label} htmlFor={`${idPrefix}zone`}>{t.checkout.area}</label>
        <AreaPicker id={`${idPrefix}zone`} zones={zones} value={value.zoneId} onChange={(zoneId) => onChange({ ...value, zoneId })} lang={lang} t={t} invalid={errors.zone} />
        {errors.zone && <p className="mt-1 text-xs font-semibold text-brand-700">{t.checkout.required}</p>}
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor={`${idPrefix}street`}>{t.checkout.street}</label>
        <input id={`${idPrefix}street`} value={value.street} onChange={set("street")} maxLength={160} autoComplete="street-address" className={`${field} ${err(errors.street)}`} {...req(errors.street)} />
        {errors.street && <p className="mt-1 text-xs font-semibold text-brand-700">{t.checkout.required}</p>}
      </div>
      <div>
        <label className={label} htmlFor={`${idPrefix}building`}>{t.checkout.building}</label>
        <input id={`${idPrefix}building`} value={value.building} onChange={set("building")} maxLength={120} className={`${field} ${err(errors.building)}`} {...req(errors.building)} />
        {errors.building && <p className="mt-1 text-xs font-semibold text-brand-700">{t.checkout.required}</p>}
      </div>
      <div>
        <label className={label} htmlFor={`${idPrefix}floor`}>{t.checkout.floor}</label>
        <input id={`${idPrefix}floor`} value={value.floor} onChange={set("floor")} maxLength={40} className={`${field} border-line`} />
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor={`${idPrefix}landmark`}>{t.checkout.landmark}</label>
        <input id={`${idPrefix}landmark`} value={value.landmark} onChange={set("landmark")} maxLength={160} placeholder={t.checkout.landmarkPlaceholder} className={`${field} border-line`} />
      </div>
      <div className="sm:col-span-2">
        <span className={label}>{t.addresses.label}</span>
        <div className="flex gap-2">
          {LABELS.map((l) => {
            const Icon = labelIcon(l);
            const on = value.label === l;
            return (
              <button type="button" key={l} onClick={() => onChange({ ...value, label: l })} aria-pressed={on}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold ${on ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-line-strong"}`}>
                <Icon className="h-4 w-4" /> {labelText(l, t)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
