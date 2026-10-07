import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

export const alt = "Oriano Pizza — Authentic New York style pizza in Lebanon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The OG renderer's built-in font has no Arabic glyphs, so the card is in English for both languages.
export default async function OgImage() {
  const logo = await readFile(path.join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: "#faf7f2" }}>
        <div style={{ display: "flex", background: "#040706", borderRadius: 14, padding: "18px 26px", alignSelf: "flex-start" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={340} height={98} alt="" />
        </div>
        <div style={{ marginTop: 44, fontSize: 28, letterSpacing: 4, color: "#ff3300", fontWeight: 700 }}>NEW YORK STYLE PIZZERIA · ZOUK MIKAEL</div>
        <div style={{ marginTop: 14, fontSize: 82, fontWeight: 800, color: "#1c1714", lineHeight: 1.02 }}>Real New York pizza.</div>
        <div style={{ fontSize: 82, fontWeight: 800, color: "#3b332d", lineHeight: 1.02 }}>Made in Lebanon.</div>
        <div style={{ marginTop: 30, fontSize: 30, color: "#6e655c" }}>Order online · Pickup & delivery</div>
      </div>
    ),
    size,
  );
}
