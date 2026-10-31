import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decode } from "fast-png";
import { describe, expect, it } from "vitest";

import { pngToRgba8 } from "../../poopm-3d/poopm-3d-png-rgba";
import { CROWD_CELL, CROWD_VARIANTS } from "./crowd-sprite";

const png = decode(readFileSync(resolve(__dirname, "../../../../assets/race/crowd-atlas.png")));
const rgba = pngToRgba8(png);

const alphaAt = (variant: number, x: number, y: number) => rgba[(y * png.width + variant * CROWD_CELL + x) * 4 + 3];

function opaqueRatio(variant: number): number {
  let count = 0;
  for (let y = 0; y < CROWD_CELL; y++) for (let x = 0; x < CROWD_CELL; x++) if (alphaAt(variant, x, y) > 200) count++;
  return count / (CROWD_CELL * CROWD_CELL);
}

describe("観客のアトラス画像", () => {
  it("4体を横に並べた大きさになる", () => {
    expect([png.width, png.height]).toEqual([CROWD_CELL * CROWD_VARIANTS, CROWD_CELL]);
  });

  it.each([0, 1, 2, 3])("%i番は区画の1〜8割を不透明に塗る", (variant) => {
    expect(opaqueRatio(variant)).toBeGreaterThan(0.1);
    expect(opaqueRatio(variant)).toBeLessThan(0.8);
  });

  it.each([0, 1, 2, 3])("%i番の四隅は透明（隣の区画に絵がはみ出さない）", (variant) => {
    const last = CROWD_CELL - 1;
    expect([alphaAt(variant, 0, 0), alphaAt(variant, last, 0), alphaAt(variant, 0, last), alphaAt(variant, last, last)]).toEqual([0, 0, 0, 0]);
  });

  it("体ごとに絵が違う", () => {
    expect(new Set([0, 1, 2, 3].map((variant) => opaqueRatio(variant).toFixed(4))).size).toBe(CROWD_VARIANTS);
  });
});
