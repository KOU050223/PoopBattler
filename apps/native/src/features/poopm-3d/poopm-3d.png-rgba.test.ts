import { describe, expect, it } from "vitest";

import { pngToRgba8 } from "./poopm-3d.png-rgba";

describe("pngToRgba8", () => {
  it("RGBA8 はそのまま通す", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...pngToRgba8({ width: 2, height: 1, data, channels: 4, depth: 8, palette: undefined })]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("RGB は不透明にする", () => {
    const data = new Uint8Array([10, 20, 30]);
    expect([...pngToRgba8({ width: 1, height: 1, data, channels: 3, depth: 8, palette: undefined })]).toEqual([10, 20, 30, 255]);
  });

  it("グレー+アルファを展開する", () => {
    const data = new Uint8Array([50, 128]);
    expect([...pngToRgba8({ width: 1, height: 1, data, channels: 2, depth: 8, palette: undefined })]).toEqual([50, 50, 50, 128]);
  });

  it("16bit は上位バイトへ落とす", () => {
    const data = new Uint16Array([0xff00, 0x8000, 0x0000, 0xffff]);
    expect([...pngToRgba8({ width: 1, height: 1, data, channels: 4, depth: 16, palette: undefined })]).toEqual([255, 128, 0, 255]);
  });

  it("パレットを展開し、アルファ無しは不透明", () => {
    const data = new Uint8Array([1, 0]);
    const palette = [[9, 9, 9], [1, 2, 3, 40]];
    expect([...pngToRgba8({ width: 2, height: 1, data, channels: 1, depth: 8, palette: palette as never })]).toEqual([1, 2, 3, 40, 9, 9, 9, 255]);
  });
});
