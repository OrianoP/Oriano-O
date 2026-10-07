import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "ar"];

/** Sends visitors without a language prefix to /en or /ar (saved choice, then browser language). */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const saved = request.cookies.get("lang")?.value;
  const prefersArabic = /(^|,)\s*ar\b/i.test(request.headers.get("accept-language") || "");
  const locale = saved && LOCALES.includes(saved) ? saved : prefersArabic ? "ar" : "en";

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals and files (anything with a dot).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
