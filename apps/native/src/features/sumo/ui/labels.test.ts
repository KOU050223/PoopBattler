import { describe, expect, it } from "vitest";
import { SPECIES } from "../config";
import { makeFighter } from "../engine";
import { hapticFor, stateMark } from "./labels";

const fighter = () => makeFighter(0, SPECIES[0]);

describe("stateMark", () => {
  it("四つの溜め中は『四つ溜め』と出す", () => {
    const f = { ...fighter(), state: "windup" as const, move: "grab" as const };
    expect(stateMark(f).label).toBe("四つ溜め");
  });

  it("いなし状態でもパリィ受付の間は『パリィ』と出す", () => {
    const f = { ...fighter(), state: "inashi" as const, t: 100, parryAct: 240 };
    expect(stateMark(f).label).toBe("パリィ");
  });

  it("パリィ受付を過ぎたら『いなし』と出す", () => {
    const f = { ...fighter(), state: "inashi" as const, t: 300, parryAct: 240 };
    expect(stateMark(f).label).toBe("いなし");
  });

  it("崩れ・がっぷりは内部名ではなく日本語で出す", () => {
    expect(stateMark({ ...fighter(), state: "stagger" }).label).toBe("崩れ");
    expect(stateMark({ ...fighter(), state: "clinch" }).label).toBe("がっぷり");
  });
});

describe("hapticFor", () => {
  it("自分が四つを受けたら強く鳴らす", () => {
    expect(hapticFor({ type: "hit", attacker: 1, defender: 0, hitType: "grab", push: 20 }, 0)).toBe("heavy");
  });

  it("自分のパリィ成功は success、相手のパリィは鳴らさない", () => {
    expect(hapticFor({ type: "parry", defender: 0, attacker: 1, isEdge: false, isStance: false, push: 10 }, 0)).toBe("success");
    expect(hapticFor({ type: "parry", defender: 1, attacker: 0, isEdge: false, isStance: false, push: 10 }, 0)).toBeNull();
  });

  it("決着は勝てば success、負ければ error", () => {
    expect(hapticFor({ type: "end", winner: 0 }, 0)).toBe("success");
    expect(hapticFor({ type: "end", winner: 1 }, 0)).toBe("error");
  });

  it("息切れなど対象外のイベントは鳴らさない", () => {
    expect(hapticFor({ type: "gas", side: 0 }, 0)).toBeNull();
  });
});
