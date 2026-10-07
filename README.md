# Oriano Pizza — online ordering (order.orianopizza.com)

The customer website for **Oriano Pizza**, Lebanon's first authentic New York style pizzeria. Customers browse the menu in English or Arabic, order for pickup or delivery, pay cash, and track their order live. Every order goes straight into the Oriano POS (`OrianoP/Oriano-pos-v4`), where staff confirm it before the kitchen starts.

## How it fits together

```
Customer phone ──▶ this site (Next.js on Vercel)
                     │  server-side only, every request signed (HMAC) with ONLINE_ORDERS_SECRET
                     ▼
                   POS  /api/public/*   ──▶  Online Orders inbox (rings + phone push) ──▶ Confirm / Reject
```

- **The POS is the single source of truth.** Menu, prices, delivery areas, opening hours, the pause switch and order status all come from it.
- **Prices are never trusted from the browser.** The POS recalculates every order from its own database.
- **The secret never reaches the browser.** Only this site's server talks to the POS.

## Features

**Ordering**
- Menu grouped by pizza base (Red, White, Vodka, Truffle, BBQ…), with sizes, extras and per-item notes.
- Cart stays on the device; the customer's details are remembered for next time.
- Pickup, or delivery by area (each area has its own fee, minimum order and ETA). Areas not on the list can't order delivery.
- Lebanese mobile numbers only: 03, 70, 71, 76, 78, 79 or 81.
- Payment is cash on delivery or at pickup. Card payments come later.

**Confirmation and tracking**
- Staff confirm every order. Before ordering, the customer is told that a confirmed order **can't be cancelled**, and there is no cancel button anywhere.
- Live tracking page: waiting → confirmed → in the oven → ready / on the way → done.
- The tracking page shows the ETA, call and WhatsApp buttons, and the reason if an order is rejected.
- "My orders" lists past orders on the same device.

**Fake-order protection**
- Mobile-number check.
- A hidden honeypot field and a minimum time on the form, to catch bots.
- Same-origin check.
- Rate limits, both here and on the POS.
- Optional Cloudflare Turnstile.
- Enforced by the POS: blocklist, a limit on unconfirmed orders per phone, a maximum order value, opening hours, and duplicate-tap detection.
- Staff confirmation before anything is cooked.

**Search engines and sharing (SEO)**
- Pages are rendered on the server and refreshed every 60 seconds.
- English and Arabic versions, linked to each other with `hreflang`.
- JSON-LD for `Restaurant`, `Menu` and offers, plus opening hours.
- `sitemap.xml`, `robots.txt`, an Open Graph share image, and a web app manifest.

**Design**
- Calm and photography-led: warm off-white paper, near-black type, condensed New York-style headings (Barlow Condensed), Inter for reading and IBM Plex Sans Arabic for Arabic.
- Oriano red `#FF3300` is kept for actions (order, add, checkout). The yellow logo sits on its own black tab.
- No emojis or cartoon art; icons come from Lucide.

**Photos**
- Drop dish photos into `public/photos/menu/`, named after the dish (`pepperoni-overload-ranch.webp`). They appear automatically on the menu and the item sheet.
- `public/photos/hero.webp` replaces the sizes panel at the top of the home page.
- `public/photos/story.webp` sits next to the "New York style" section.
- A photo URL set on the product in the POS takes priority over the bundled file.
- See `public/photos/README.md`.

**Language**
- Visitors always land on English (`/en`). Arabic is used only when someone picks it with the language switch, and that choice is remembered.

## Setup

1. In the **POS** (Replit/Render), set `ONLINE_ORDERS_SECRET` to a long random string.
2. In the **POS**, open **Online Setup** and add your delivery areas and opening hours.
3. Deploy this repo to **Vercel**, with these environment variables (see `.env.example`):
   - `POS_API_URL`: the POS address, e.g. `https://oriano-pos.replit.app`
   - `ONLINE_ORDERS_SECRET`: the same value as on the POS
   - `NEXT_PUBLIC_SITE_URL`: `https://order.orianopizza.com`
4. In Vercel → Domains, add `order.orianopizza.com`, then create the `CNAME` record at your domain registrar.

**Check the connection:** open `https://<your-site>/api/status`. It says in plain words whether the site is connected and taking orders, and if not, why. Possible reasons:
- the variables are missing, or Vercel wasn't redeployed after they were added
- the secret doesn't match the POS
- the POS can't be reached, or is an old version
- ordering is paused in the POS
- it's outside opening hours

It never shows secrets.

If the POS is unreachable, the site still loads. It shows the menu with ordering marked unavailable, and recovers automatically within a minute.

Without `POS_API_URL` / `ONLINE_ORDERS_SECRET`, the site runs in **preview mode**. It shows the bundled sample menu (`data/sample-menu.json`) and ordering is disabled.

## Development

```bash
npm install
cp .env.example .env.local   # point POS_API_URL at a local POS (npm run dev there, port 5000)
npm run dev                  # http://localhost:3000
npm run typecheck
npm test                     # phone-number rules
npm run build
```
