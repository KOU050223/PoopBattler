import { describe, expect, it } from "vitest";
import { raceGroundLayout } from "./race-title-ground";

describe("raceGroundLayout", () => {
  it("画面の幅より広く、相棒の中心に横方向で揃える", () => {
    const { width, left } = raceGroundLayout(200, 390);

    expect(width).toBeGreaterThan(390);
    expect(Math.abs(left + width / 2 - 100)).toBeLessThanOrEqual(1); // 整数に丸めた分
  });

  it("楕円の頂点がスプライトの下端より上、足裏あたりに来る", () => {
    const size = 200;
    const spriteHeight = size * (260 / 207);
    const { top } = raceGroundLayout(size, 390);

    expect(top).toBeLessThan(spriteHeight);
    expect(top).toBeGreaterThan(spriteHeight * (220 / 260) - size * 0.4);
  });

  it("ホームの台座と同じ浅さ（縦横比 0.6）の楕円で、端でも縁の落ち込みが小さい", () => {
    const { width, height } = raceGroundLayout(200, 390);
    const rx = width / 2;
    const ry = height / 2;
    const sagAtScreenEdge = ry * (1 - Math.sqrt(1 - (195 / rx) ** 2));

    expect(ry / rx).toBeCloseTo(0.6, 1);
    expect(sagAtScreenEdge).toBeLessThan(40);
  });

  it("下は画面の外へ伸びる（頂点から 400 以上の高さがある）", () => {
    expect(raceGroundLayout(200, 390).height).toBeGreaterThanOrEqual(400);
  });
});
