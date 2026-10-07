// Lebanese mobile number rules — keep identical to the POS (shared/online.ts).
// Mobiles: 03 xxx xxx (national "3" + 6 digits) or 70/71/76/78/79/81 + 6 digits.
const MOBILE_RE = /^(3\d{6}|(70|71|76|78|79|81)\d{6})$/;

/** National significant number ("3515078", "71123456") or null if not a Lebanese mobile. */
export function lebaneseMobileNational(input: string): string | null {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("00961")) d = d.slice(5);
  else if (d.startsWith("961")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return MOBILE_RE.test(d) ? d : null;
}

/** Pretty local format for display: "03 515 078" / "71 123 456". */
export function formatLebaneseMobile(national: string): string {
  if (national.length === 7) return `0${national[0]} ${national.slice(1, 4)} ${national.slice(4)}`;
  return `${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}
