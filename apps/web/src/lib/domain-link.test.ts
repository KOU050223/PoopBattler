import { describe, expect, it } from "vitest";
import type { Clock } from "@poopbattler/domain/ports";

describe("@poopbattler/domain link", () => {
  it("resolves the ports module", async () => {
    const mod = await import("@poopbattler/domain/ports");
    expect(mod).toBeDefined();
    const clock: Clock = { now: () => new Date(0) };
    expect(clock.now().getTime()).toBe(0);
  });
});
