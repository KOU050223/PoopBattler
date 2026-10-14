import { describe, expect, it } from "vitest";
import type { Clock } from "./ports";

describe("domain smoke", () => {
  it("runs without DOM", () => {
    const clock: Clock = { now: () => new Date(0) };
    expect(clock.now().getTime()).toBe(0);
    expect("window" in globalThis).toBe(false);
  });
});
