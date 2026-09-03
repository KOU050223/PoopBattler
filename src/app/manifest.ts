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
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
