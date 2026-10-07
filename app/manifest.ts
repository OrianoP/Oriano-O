import type { MetadataRoute } from "next";

// Lets customers add Oriano to their home screen for one-tap reordering.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oriano Pizza — Order Online",
    short_name: "Oriano Pizza",
    description: "Authentic New York style pizza in Lebanon. Order for pickup or delivery.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff6ec",
    theme_color: "#ff3300",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
