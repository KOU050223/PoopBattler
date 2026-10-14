import { describe, expect, it } from "vitest";

import {
  POOPM_PART_MOTIONS,
  poopmBodyMotion,
  poopmEyesMotion,
  poopmHeadMotion,
  poopmLimbMotion,
  poopmMouthMotion,
} from "./poopm.motion";
import type { PoopmMotion } from "./poopm.types";

const MOTIONS: PoopmMotion[] = ["idle", "hit", "eat"];

describe("poopm part motion", () => {
  it("被弾はパーツを個別にずらさず、idle と同じポーズを使う", () => {
    expect(poopmBodyMotion.hit).toBe(poopmBodyMotion.idle);
    expect(poopmHeadMotion.hit).toBe(poopmHeadMotion.idle);
    expect(poopmLimbMotion.hit).toBe(poopmLimbMotion.idle);
    expect(poopmEyesMotion.hit).toBe(poopmEyesMotion.idle);
    expect(poopmMouthMotion.hit).toBe(poopmMouthMotion.idle);
  });

  it("hit の x はオフセット keyframes ではなく 0 のまま", () => {
    for (const [name, motions] of Object.entries(POOPM_PART_MOTIONS)) {
      expect(motions.hit.x, name).toBe(0);
      expect(Array.isArray(motions.hit.x), name).toBe(false);
    }
  });

  it("idle / eat も x を 0 に戻すので hit の残りが残らない", () => {
    for (const motions of Object.values(POOPM_PART_MOTIONS)) {
      for (const motion of MOTIONS) {
        expect(motions[motion].x).toBe(0);
      }
    }
  });

  it("idle の呼吸・まばたきは残る", () => {
    expect(poopmBodyMotion.idle.y).toEqual([0, 2, 0]);
    expect(poopmBodyMotion.idle.scaleY).toEqual([1, 1.025, 1]);
    expect(poopmEyesMotion.idle.scaleY).toEqual([1, 1, 0.12, 1, 1]);
    expect(poopmHeadMotion.idle.rotate).toEqual([-2, 2, -2]);
  });

  it("eat は部位ごとの反応を残す", () => {
    expect(poopmBodyMotion.eat.y).toEqual([0, -8, 2, 0]);
    expect(poopmMouthMotion.eat.scale).toEqual([1, 1.18, 0.96, 1]);
    expect(poopmHeadMotion.eat.rotate).toEqual([0, 5, -2, 0]);
  });
});
