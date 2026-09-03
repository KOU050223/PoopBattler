import { describe, expect, it } from "vitest";

import {
  battleFigureAnimate,
  battleFigureTransition,
} from "./battle-figure.motion";

describe("battle figure motion", () => {
  it("被弾シェイクはコンテナの x だけが担う", () => {
    expect(battleFigureAnimate.hit.x).toEqual([0, -10, 10, -6, 0]);
    expect(battleFigureAnimate.hit.y).toBe(0);
  });

  it("idle と attack は x を 0 に戻す", () => {
    expect(battleFigureAnimate.idle.x).toBe(0);
    expect(battleFigureAnimate.attack.x).toBe(0);
  });

  it("idle の上下の呼吸は残る", () => {
    expect(battleFigureAnimate.idle.y).toEqual([0, -5, 0]);
  });

  it("idle へ戻るとき x はすぐ 0 に戻す", () => {
    const transition = battleFigureTransition("idle", 1);
    expect(transition).toMatchObject({
      x: { duration: 0 },
    });
  });
});
