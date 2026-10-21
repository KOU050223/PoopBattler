import { describe, expect, it } from "vitest";
import { NO_SLOWMO, SLOWMO_MIN_SCALE, slowmoScale, startSlowmo } from "./slowmo";

const state = startSlowmo(NO_SLOWMO, 1000, 1000);

describe("slowmoScale", () => {
  it("スローモーを始めていなければ 1", () => {
    expect(slowmoScale(NO_SLOWMO, 500)).toBe(1);
  });

  it("開始の瞬間は 1", () => {
    expect(slowmoScale(state, 1000)).toBe(1);
  });

  it("立ち上がり12%の終わりで最小値に着く", () => {
    expect(slowmoScale(state, 1120)).toBeCloseTo(SLOWMO_MIN_SCALE);
  });

  it("立ち上がりの途中は 1 と最小値の間", () => {
    const scale = slowmoScale(state, 1060);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThan(SLOWMO_MIN_SCALE);
  });

  it("12%〜70% は最小値のまま", () => {
    expect(slowmoScale(state, 1400)).toBe(SLOWMO_MIN_SCALE);
  });

  it("70%を過ぎると 1 へ戻り始める", () => {
    expect(slowmoScale(state, 1850)).toBeGreaterThan(SLOWMO_MIN_SCALE);
    expect(slowmoScale(state, 1850)).toBeLessThan(1);
  });

  it("終了時刻で 1 に戻る", () => {
    expect(slowmoScale(state, 2000)).toBe(1);
  });

  it("長さ 0 の開始は無視して前の状態を保つ", () => {
    expect(startSlowmo(state, 1500, 0)).toBe(state);
  });
});
