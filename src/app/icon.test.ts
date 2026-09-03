import { describe, expect, it } from "vitest";

import { generateImageMetadata } from "./icon";

describe("PWA icon metadata", () => {
  it("Chromiumの導入条件となる192pxと512pxのアイコンを出す", () => {
    expect(generateImageMetadata()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "192", size: { width: 192, height: 192 } }),
      expect.objectContaining({ id: "512", size: { width: 512, height: 512 } }),
    ]));
  });
});
