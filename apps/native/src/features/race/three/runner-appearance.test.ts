import { describe, expect, it } from "vitest";

import { DEFAULT_APPEARANCE } from "../../battle/poopm-appearance";
import { RUNNER_COUNT } from "../config";
import { runnerAppearance } from "./runner-appearance";

const all = Array.from({ length: RUNNER_COUNT }, (_, index) => runnerAppearance(index));

describe("runnerAppearance", () => {
  it("走者全員で色と頭の組み合わせが被らない", () => {
    expect(new Set(all.map((a) => `${a.color}/${a.head}`)).size).toBe(RUNNER_COUNT);
  });

  it("0 番（プレイヤー）以外の 1〜6 番は帽子をかぶっている", () => {
    expect(all.slice(1, 7).every((a) => a.head !== "none")).toBe(true);
  });

  it("0 番（プレイヤー）はノーマルうんちくん", () => {
    expect(all[0]).toEqual(DEFAULT_APPEARANCE);
  });

  it("同じ番号なら毎回同じ見た目になる", () => {
    expect(runnerAppearance(3)).toEqual(runnerAppearance(3));
  });
});
