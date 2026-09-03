import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poop Battler",
    short_name: "Poop Battler",
    description: "食事と排便の記録を、うんちモンスターとのバトルとして続けられるアプリ。",
    start_url: "/",
    display: "standalone",
    background_color: "#ffe0ef",
    theme_color: "#ffe0ef",
    lang: "ja",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
