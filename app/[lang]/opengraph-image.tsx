import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

export const alt = "Oriano Pizza — Authentic New York style pizza in Lebanon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The OG renderer's built-in font has no Arabic glyphs, so the card is in English for both languages.
export default async function OgImage() {
  const logo = await readFile(path.join(process.cwd(), "public/logo-mark.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  let photoSrc: string | null = null;
  try {
    const photo = await readFile(path.join(process.cwd(), "public/photos/hero.webp"));
    photoSrc = `data:image/webp;base64,${photo.toString("base64")}`;
  } catch {}
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b0908", color: "#f6efe4", position: "relative" }}>
        {photoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoSrc} width={640} height={630} alt="" style={{ position: "absolute", right: 0, top: 0, width: 640, height: 630, objectFit: "cover" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #0b0908 46%, rgba(11,9,8,0.75) 62%, rgba(11,9,8,0) 100%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", width: 720 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={300} height={89} alt="" />
          <div style={{ marginTop: 40, fontSize: 22, letterSpacing: 6, color: "#ffd60a", fontWeight: 700 }}>LEBANON&apos;S FIRST NY STYLE PIZZERIA</div>
          <div style={{ marginTop: 14, fontSize: 86, fontWeight: 800, lineHeight: 0.95 }}>Real New York</div>
          <div style={{ fontSize: 86, fontWeight: 800, lineHeight: 0.95, color: "#ff3300" }}>pizza.</div>
          <div style={{ marginTop: 22, fontSize: 30, color: "#cdbfae" }}>Zouk Mikael · Order online · Pickup & delivery</div>
        </div>
      </div>
    ),
    size,
  );
}
