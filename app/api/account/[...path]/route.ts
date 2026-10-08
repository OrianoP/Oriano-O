import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { PREVIEW_MODE, PosError, posFetch } from "@/lib/pos";
import { clientIp, limited, sameOrigin } from "@/lib/guard";
import { GOOGLE_CLIENT_ID, SESSION_COOKIE, type AccountMe, type AccountState } from "@/lib/account";

/**
 * Customer accounts, forwarded to the POS. The POS session token lives only
 * in an httpOnly cookie on this site; the browser never sees it.
 *
 *   GET    /api/account/me                 → AccountState
 *   POST   /api/account/start              { phone, lang }   sends a WhatsApp code
 *   POST   /api/account/verify             { phone, code, name? } signs in
 *   POST   /api/account/google             { credential }  signs in with a Google ID token
 *   POST   /api/account/logout
 *   PATCH  /api/account/me                 { name, phone? }  (phone: Google accounts only)
 *   POST   /api/account/addresses          { label, zoneId, street, building, floor, landmark }
 *   PATCH  /api/account/addresses/:id      same fields, or { used: true }
 *   DELETE /api/account/addresses/:id
 */
export const dynamic = "force-dynamic";

type PosMe = { name: string; phone: string; email?: string; provider?: "phone" | "google"; addresses: { id: number; label: string; zoneId: number | null; street: string; building: string; floor: string; landmark: string }[] };
const toMe = (m: PosMe): AccountMe => ({ name: m.name, phone: m.phone, email: m.email || "", provider: m.provider || "phone", addresses: m.addresses.map((a) => ({ ...a, id: `a${a.id}` })) });
const fail = (status: number, code: string, message: string) => NextResponse.json({ code, message }, { status });

const ON = { signInAvailable: true as const, phoneSignIn: true };
async function signedIn(r: { token: string; maxAgeDays: number; me: PosMe }) {
  const res = NextResponse.json({ signedIn: true, me: toMe(r.me), ...ON } satisfies AccountState);
  res.cookies.set(SESSION_COOKIE, r.token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: r.maxAgeDays * 86_400,
  });
  return res;
}

async function token() {
  return (await cookies()).get(SESSION_COOKIE)?.value || "";
}
async function clearCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
const posId = (id: string | undefined) => (id && /^a\d+$/.test(id) ? id.slice(1) : null);

async function handle(req: NextRequest, path: string[]) {
  if (PREVIEW_MODE) return fail(503, "preview", "Accounts aren't connected yet.");
  if (req.method !== "GET" && !sameOrigin(req)) return fail(403, "origin", "Please use the Oriano website.");
  const ip = clientIp(req);
  const [first, second] = path;
  const body = req.method === "GET" || req.method === "DELETE" ? undefined : await req.json().catch(() => ({}));
  const tok = await token();

  try {
    // ── Who am I ──
    if (first === "me" && req.method === "GET") {
      if (!tok) {
        const avail = await posFetch<{ signIn: boolean }>("GET", "/api/public/account/available").catch(() => ({ signIn: false }));
        return NextResponse.json({ signedIn: false, me: null, signInAvailable: avail.signIn || !!GOOGLE_CLIENT_ID, phoneSignIn: avail.signIn } satisfies AccountState, { headers: { "Cache-Control": "no-store" } });
      }
      const me = await posFetch<PosMe>("GET", "/api/public/account/me", { customerToken: tok });
      return NextResponse.json({ signedIn: true, me: toMe(me), ...ON } satisfies AccountState, { headers: { "Cache-Control": "no-store" } });
    }

    // ── Sign in ──
    if (first === "start" && req.method === "POST") {
      if (limited(`acct-start:${ip}`, 6, 10 * 60_000)) return fail(429, "rate", "Too many codes requested. Please wait a few minutes.");
      const r = await posFetch<{ sent: boolean; channel: string; devCode?: string }>("POST", "/api/public/account/start", { body: { phone: String(body?.phone || ""), lang: body?.lang === "ar" ? "ar" : "en" }, customerIp: ip });
      return NextResponse.json(r);
    }
    if (first === "verify" && req.method === "POST") {
      if (limited(`acct-verify:${ip}`, 15, 10 * 60_000)) return fail(429, "rate", "Too many tries. Please wait a few minutes.");
      const r = await posFetch<{ token: string; maxAgeDays: number; me: PosMe }>("POST", "/api/public/account/verify", {
        body: { phone: String(body?.phone || ""), code: String(body?.code || ""), name: String(body?.name || "") }, customerIp: ip,
      });
      return signedIn(r);
    }
    if (first === "google" && req.method === "POST") {
      if (!GOOGLE_CLIENT_ID) return fail(503, "unavailable", "Google sign-in isn't set up yet.");
      if (limited(`acct-google:${ip}`, 20, 10 * 60_000)) return fail(429, "rate", "Too many tries. Please wait a few minutes.");
      const credential = String(body?.credential || "");
      if (credential.length < 100 || credential.length > 4096) return fail(422, "google", "Google sign-in didn't work. Please try again.");
      return signedIn(await posFetch<{ token: string; maxAgeDays: number; me: PosMe }>("POST", "/api/public/account/google", {
        body: { credential, clientId: GOOGLE_CLIENT_ID }, customerIp: ip,
      }));
    }
    if (first === "logout" && req.method === "POST") {
      if (tok) await posFetch("POST", "/api/public/account/logout", { body: {}, customerToken: tok }).catch(() => {});
      return clearCookie(NextResponse.json({ signedIn: false, me: null, signInAvailable: true, phoneSignIn: false } satisfies AccountState));
    }

    // ── Signed-in only ──
    if (!tok) return fail(401, "signed_out", "Please sign in again.");
    let me: PosMe | null = null;
    if (first === "me" && req.method === "PATCH") me = await posFetch<PosMe>("PATCH", "/api/public/account/me", { body: { name: String(body?.name || ""), phone: body?.phone ? String(body.phone) : undefined }, customerToken: tok });
    else if (first === "addresses" && !second && req.method === "POST") me = await posFetch<PosMe>("POST", "/api/public/account/addresses", { body, customerToken: tok });
    else if (first === "addresses" && posId(second) && req.method === "PATCH") me = await posFetch<PosMe>("PATCH", `/api/public/account/addresses/${posId(second)}`, { body, customerToken: tok });
    else if (first === "addresses" && posId(second) && req.method === "DELETE") me = await posFetch<PosMe>("DELETE", `/api/public/account/addresses/${posId(second)}`, { customerToken: tok });
    else return fail(404, "not_found", "Not found.");
    return NextResponse.json({ signedIn: true, me: toMe(me), ...ON } satisfies AccountState);
  } catch (e) {
    if (e instanceof PosError) {
      const res = fail(e.status, e.code, e.message);
      return e.code === "signed_out" ? clearCookie(res) : res;
    }
    return fail(500, "server", "Something went wrong. Please try again.");
  }
}

type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(req: NextRequest, ctx: Ctx) { return handle(req, (await ctx.params).path); }
export async function POST(req: NextRequest, ctx: Ctx) { return handle(req, (await ctx.params).path); }
export async function PATCH(req: NextRequest, ctx: Ctx) { return handle(req, (await ctx.params).path); }
export async function DELETE(req: NextRequest, ctx: Ctx) { return handle(req, (await ctx.params).path); }
