import { describe, expect, it } from "vitest";

import { isTitleShake } from "./title-shake";

function axis(x: number, y: number, z: number) {
  return { x, y, z };
}

describe("isTitleShake", () => {
  it("線形加速度が十分に大きいときだけシェイクとして扱う", () => {
    expect(
      isTitleShake({
        acceleration: axis(0, 0, 3.4),
        accelerationIncludingGravity: axis(0, 9.8, 0),
      }),
    ).toBe(false);
    expect(
      isTitleShake({
        acceleration: axis(0, 0, 3.5),
        accelerationIncludingGravity: axis(0, 9.8, 0),
      }),
    ).toBe(true);
  });

  it("線形加速度が無い端末では静止重力を除外し、十分な変化だけ扱う", () => {
    expect(
      isTitleShake({
        acceleration: null,
        accelerationIncludingGravity: axis(0, 9.8, 0),
      }),
    ).toBe(false);
    expect(
      isTitleShake({
        acceleration: null,
        accelerationIncludingGravity: axis(0, 0, 13),
      }),
    ).toBe(true);
  });
});
