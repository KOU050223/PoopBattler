import { describe, expect, it } from "vitest";
import { createRng, shuffle } from "./rng";

describe("シード付き乱数", () => {
  it("同じシードなら同じ列になる", () => {
    const a = createRng(7);
    const b = createRng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("shuffle は元の配列を変えずに同じ要素を並べ替える", () => {
    const items = [1, 2, 3, 4, 5];
    const shuffled = shuffle(createRng(3), items);
    expect([...shuffled].sort()).toEqual(items);
  });

  it("shuffle は元の配列を書き換えない", () => {
    const items = [1, 2, 3, 4, 5];
    shuffle(createRng(3), items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
