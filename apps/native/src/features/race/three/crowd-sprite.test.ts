import { describe, expect, it } from "vitest";
import { CROWD_VARIANTS, renderCrowdAtlas, SPRITE_CELL } from "./crowd-sprite";

function opaqueCount(atlas: ReturnType<typeof renderCrowdAtlas>, variant: number): number {
  let count = 0;
  for (let row = 0; row < atlas.height; row++) {
    for (let column = 0; column < SPRITE_CELL; column++) {
      if (atlas.pixels[(row * atlas.width + variant * SPRITE_CELL + column) * 4 + 3] > 200) count++;
    }
  }
  return count;
}

describe("renderCrowdAtlas", () => {
  const atlas = renderCrowdAtlas();

  it("4体を横に並べた大きさになる", () => {
    expect([atlas.width, atlas.height, atlas.pixels.length]).toEqual([SPRITE_CELL * CROWD_VARIANTS, SPRITE_CELL, SPRITE_CELL * CROWD_VARIANTS * SPRITE_CELL * 4]);
  });

  it.each([0, 1, 2, 3])("%i番は画面の1〜8割を不透明に塗る", (variant) => {
    const ratio = opaqueCount(atlas, variant) / (SPRITE_CELL * SPRITE_CELL);

    expect(ratio).toBeGreaterThan(0.1);
    expect(ratio).toBeLessThan(0.8);
  });

  it("四隅は透明", () => {
    const corner = (x: number, y: number) => atlas.pixels[(y * atlas.width + x) * 4 + 3];

    expect([corner(0, 0), corner(SPRITE_CELL - 1, 0), corner(0, SPRITE_CELL - 1), corner(SPRITE_CELL - 1, SPRITE_CELL - 1)]).toEqual([0, 0, 0, 0]);
  });

  it("体の色が体ごとに違う", () => {
    const center = (variant: number) => Array.from(atlas.pixels.slice((Math.floor(SPRITE_CELL * 0.6) * atlas.width + variant * SPRITE_CELL + Math.floor(SPRITE_CELL * 0.3)) * 4, (Math.floor(SPRITE_CELL * 0.6) * atlas.width + variant * SPRITE_CELL + Math.floor(SPRITE_CELL * 0.3)) * 4 + 3)).join(",");

    expect(new Set([0, 1, 2, 3].map(center)).size).toBe(CROWD_VARIANTS);
  });
});
