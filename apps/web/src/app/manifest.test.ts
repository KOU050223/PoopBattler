import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "ja",
  getTranslations: async () => (key: string) => key,
}));

const { default: manifest } = await import("./manifest");

describe("PWA manifest icons", () => {
  it("Chromiumの導入条件となる192pxと512pxをany/maskableの両方で出す", async () => {
    const icons = (await manifest()).icons ?? [];
    const shapes = icons.map((icon) => `${icon.purpose}:${icon.sizes}`);

    expect(shapes).toEqual(expect.arrayContaining([
      "any:192x192",
      "any:512x512",
      "maskable:192x192",
      "maskable:512x512",
    ]));
  });

  it("宣言したアイコンのファイルがpublicに存在する", async () => {
    const icons = (await manifest()).icons ?? [];

    for (const icon of icons) {
      const filePath = path.join(process.cwd(), "public", icon.src);
      expect(existsSync(filePath), `${icon.src} が見つからない`).toBe(true);
    }
  });
});
