import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { beginBridge, bridgeScore, updateBridge } from "./bridge";
import { createOutput } from "./shared";
import { SEED } from "./test-helpers";

describe("つり橋の出来", () => {
  it("針が真ん中なら1", () => {
    expect(bridgeScore(0)).toBe(1);
  });

  it("中央から ±0.25 までは1", () => {
    expect([bridgeScore(0.25), bridgeScore(-0.25)]).toEqual([1, 1]);
  });

  it("端（±1）では0", () => {
    expect([bridgeScore(1), bridgeScore(-1)]).toEqual([0, 0]);
  });

  it("安全圏と端の真ん中（0.625）では0.5", () => {
    expect(bridgeScore(0.625)).toBeCloseTo(0.5);
  });
});

describe("つり橋の針", () => {
  it("針が端に着いたら ±1 で止まり、速さも0に戻る", () => {
    const state = beginBridge(createRng(SEED), 0.5);
    state.needle = 0.999;
    state.needleVelocity = 5;

    updateBridge(state, createOutput());

    expect([state.needle, state.needleVelocity]).toEqual([1, 0]);
  });

  it("右の長押しは針を右へ押す", () => {
    const state = beginBridge(createRng(SEED), 0.5);
    state.needle = 0;
    state.phases = [0, 0];
    state.elapsedSec = -0.5; // ゆれ(drift)が 0 になる付近から始める
    state.holdDir = 1;

    for (let i = 0; i < 12; i++) updateBridge(state, createOutput());

    expect(state.needle).toBeGreaterThan(0);
  });

  it("針の位置と出来をエンジンへ毎ステップ渡す", () => {
    const state = beginBridge(createRng(SEED), 0.5);
    const out = createOutput();

    updateBridge(state, out);

    expect(out.commands.map((command) => command.type)).toEqual(["setPerf", "setBridgeNeedle"]);
  });

  it("同じシードなら針の始まりも同じ", () => {
    expect(beginBridge(createRng(SEED), 0.5).needle).toBe(beginBridge(createRng(SEED), 0.5).needle);
  });
});
