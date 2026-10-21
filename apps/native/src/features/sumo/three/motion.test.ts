import { describe, expect, it } from "vitest";
import { SPECIES } from "../config";
import { makeFighter } from "../engine";
import { manualGame } from "../test-helpers";
import type { Fighter, FighterState } from "../types";
import { motionOf } from "./motion";

const fighterIn = (state: FighterState, patch: Partial<Fighter> = {}): Fighter => ({ ...makeFighter(0, SPECIES[0]), state, ...patch });

describe("motionOf", () => {
  it.each([
    ["active", "attack"],
    ["lunge", "special_fire"],
    ["stagger", "hit"],
    ["stance", "special_charge"],
    ["idle", "idle"],
    ["recover", "idle"],
    ["clinch", "idle"],
  ] as const)("%s のときは %s", (state, expected) => {
    expect(motionOf(fighterIn(state), manualGame().game)).toBe(expected);
  });

  it("windup は四つ・必殺なら溜め、通常の突きなら idle のまま", () => {
    const { game } = manualGame();
    expect(motionOf(fighterIn("windup", { move: "grab" }), game)).toBe("special_charge");
    expect(motionOf(fighterIn("windup", { move: "tsuki", special: true }), game)).toBe("special_charge");
    expect(motionOf(fighterIn("windup", { move: "tsuki" }), game)).toBe("idle");
  });

  it("決着後は勝者が win、敗者が lose（状態より優先）", () => {
    const { game } = manualGame();
    game.winner = 1;
    expect(motionOf(fighterIn("active", { side: 1 }), game)).toBe("win");
    expect(motionOf(fighterIn("active", { side: 0 }), game)).toBe("lose");
  });
});
