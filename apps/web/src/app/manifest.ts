import type { MetadataRoute } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [locale, common, pwa] = await Promise.all([
    getLocale(),
    getTranslations("Common"),
    getTranslations("Pwa"),
  ]);

  return {
    name: common("appName"),
    short_name: pwa("manifestShortName"),
    description: pwa("manifestDescription"),
    start_url: "/",
    display: "standalone",
    background_color: "#ffe0ef",
    theme_color: "#ffe0ef",
    lang: locale,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
