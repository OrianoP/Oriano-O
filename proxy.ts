import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "ar"];

/**
 * Visitors without a language prefix go to English. Arabic is only used when
 * the visitor picked it with the language switch (saved in the "lang" cookie).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const saved = request.cookies.get("lang")?.value;
  const locale = saved === "ar" ? "ar" : "en";

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals and files (anything with a dot).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
