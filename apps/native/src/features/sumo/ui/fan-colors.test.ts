import { describe, expect, it } from "vitest";
import type { FanState } from "./hud";
import { fanColors } from "./fan-colors";

const STATES: FanState[] = ["idle", "warn", "hold", "parry"];

describe("fanColors", () => {
  it("2D の idle は従来の灰色のまま", () => {
    expect(fanColors("idle", false)).toEqual({
      fill: "rgba(75,75,75,0.05)",
      stroke: "rgba(75,75,75,0.22)",
      labelFill: "rgba(75,75,75,0.6)",
      labelStroke: null,
    });
  });

  it.each(STATES)("2D の %s はラベルを縁取らない", (state) => {
    expect(fanColors(state, false).labelStroke).toBeNull();
  });

  it("3D の idle は白系の半透明で縁がはっきりしている", () => {
    const colors = fanColors("idle", true);
    expect(colors.fill).toBe("rgba(255,255,255,0.2)");
    expect(colors.stroke).toBe("rgba(255,255,255,0.5)");
  });

  it.each(STATES)("3D の %s は塗りが半透明で、ラベルを暗い縁取りで読ませる", (state) => {
    const colors = fanColors(state, true);
    const alpha = Number(/,([\d.]+)\)$/.exec(colors.fill)?.[1]);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(1);
    expect(colors.labelStroke).not.toBeNull();
  });

  it.each(STATES)("%s の 3D 配色は 2D と異なる", (state) => {
    expect(fanColors(state, true).fill).not.toBe(fanColors(state, false).fill);
  });
});
