import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { en: `${SITE_URL}/en`, ar: `${SITE_URL}/ar` };
  return [
    { url: `${SITE_URL}/en`, changeFrequency: "daily", priority: 1, alternates: { languages } },
    { url: `${SITE_URL}/ar`, changeFrequency: "daily", priority: 0.9, alternates: { languages } },
  ];
}
