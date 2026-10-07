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
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fff6ec" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 80px", gap: 60 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", background: "#080808", borderRadius: 28, padding: "18px 26px", alignSelf: "flex-start" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} width={360} height={104} alt="" />
            </div>
            <div style={{ marginTop: 36, fontSize: 76, fontWeight: 900, color: "#2b1a12", lineHeight: 1 }}>
              Real New York pizza.
            </div>
            <div style={{ fontSize: 76, fontWeight: 900, color: "#ff3300", lineHeight: 1.05 }}>
              Right here in Lebanon.
            </div>
            <div style={{ marginTop: 24, fontSize: 30, color: "#6b5446" }}>Zouk Mikael · Pickup & delivery · Order online</div>
          </div>
          <div style={{ width: 360, height: 360, borderRadius: 999, background: "#ff3300", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 220 }}>
            🍕
          </div>
        </div>
        <div style={{ height: 36, display: "flex", backgroundImage: "linear-gradient(90deg, #ff3300 50%, #fff6ec 50%)", backgroundSize: "72px 36px" }} />
      </div>
    ),
    size,
  );
}
