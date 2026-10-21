import { describe, expect, it } from "vitest";
import type { PopTone } from "./pop";
import { POP_COLORS } from "./palette";
import { popStyleFor } from "./pop-colors";

const TONES: PopTone[] = ["east", "west", "parry", "dodge", "special", "grab", "hot", "warn", "neutral"];

describe("popStyleFor", () => {
  it.each(TONES)("2D の %s は従来の色と白い縁のまま", (tone) => {
    const style = popStyleFor(tone, false);
    expect(style.textColor).toBe(POP_COLORS[tone]);
    expect(style.textShadowColor).toBe("rgba(255,255,255,0.95)");
    expect(style.textShadowRadius).toBe(6);
  });

  it.each(TONES)("3D の %s は暗い縁取りと白いサブ文字になる", (tone) => {
    const style = popStyleFor(tone, true);
    expect(style.textShadowColor).toBe("rgba(0,0,0,0.75)");
    expect(style.subColor).toBe("#ffffff");
    expect(style.textColor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(TONES)("%s の文字色は 2D と 3D で異なる（3D 用に明るくしてある）", (tone) => {
    expect(popStyleFor(tone, true).textColor).not.toBe(popStyleFor(tone, false).textColor);
  });
});
