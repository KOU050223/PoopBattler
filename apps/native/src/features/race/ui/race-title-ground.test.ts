import { describe, expect, it } from "vitest";
import { raceGroundLayout } from "./race-title-ground";

describe("raceGroundLayout", () => {
  it("相棒より広く、横方向に中央揃えで置く", () => {
    const { width, left } = raceGroundLayout(200);

    expect(width).toBeGreaterThan(200);
    expect(left).toBe(-Math.round((width - 200) / 2));
  });

  it("楕円の中心がスプライトの下端より上、足裏あたりに来る", () => {
    const size = 200;
    const spriteHeight = size * (260 / 207);
    const { top, height } = raceGroundLayout(size);
    const centerY = top + height / 2;

    expect(centerY).toBeLessThan(spriteHeight);
    expect(centerY).toBeGreaterThan(spriteHeight * (220 / 260));
  });

  it("相棒が小さくなると地面も比例して小さくなる", () => {
    expect(raceGroundLayout(100).width * 2).toBe(raceGroundLayout(200).width);
  });
});
