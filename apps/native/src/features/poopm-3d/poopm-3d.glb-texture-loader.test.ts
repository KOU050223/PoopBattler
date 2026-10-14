import { encode } from "fast-png";
import { describe, expect, it } from "vitest";

import { dataUriToBytes, decodePngDataUri } from "./poopm-3d.glb-texture-loader";

function pngDataUri(): string {
  const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128]);
  const bytes = encode({ width: 2, height: 1, data: rgba, channels: 4, depth: 8 });
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("glb-texture-loader", () => {
  it("PNG data URI を RGBA の DataTexture にデコードする", () => {
    const texture = decodePngDataUri(pngDataUri());
    expect([texture.image.width, texture.image.height]).toEqual([2, 1]);
    expect(Array.from(texture.image.data as Uint8Array)).toEqual([255, 0, 0, 255, 0, 255, 0, 128]);
  });

  it("blob: URL は黙って通さず例外にする", () => {
    expect(() => dataUriToBytes("blob:abc")).toThrow(/unsupported texture URI/);
  });
});
