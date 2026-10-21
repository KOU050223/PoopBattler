import { describe, expect, it } from "vitest";
import { SPECIES } from "../config";
import { makeFighter } from "../engine";
import type { Fighter, SumoEvent } from "../types";
import { HOT_POP_DELAY_MS, popFor, repeatHintFor } from "./pop";

const east = (): Fighter => makeFighter(0, SPECIES[0]);
const west = (): Fighter => makeFighter(1, SPECIES[1]);
const popOf = (event: SumoEvent, fighters: [Fighter, Fighter] = [east(), west()]) => popFor(event, fighters, 0);

describe("popFor", () => {
  it("突きが当たると『突き』と押し込んだ量を出す", () => {
    expect(popOf({ type: "hit", attacker: 0, defender: 1, hitType: "tsuki", push: 18 })).toMatchObject({ text: "突き", sub: "東が 18 押し込む", tone: "east" });
  });

  it("必殺で当てたときは必殺の名前を出す", () => {
    const attacker = { ...east(), special: true };
    const pop = popOf({ type: "hit", attacker: 0, defender: 1, hitType: "tsuki", push: 40 }, [attacker, west()]);
    expect(pop?.text).toBe(SPECIES[0].special.name);
  });

  it("相手の攻撃が当たると西の色で出す", () => {
    expect(popOf({ type: "hit", attacker: 1, defender: 0, hitType: "grab", push: 26 })).toMatchObject({ text: "寄り", tone: "west" });
  });

  it("土俵際のパリィは『うっちゃり！』、そうでなければ『パリィ！』", () => {
    expect(popOf({ type: "block", defender: 0, attacker: 1, isEdge: true, push: 10 })?.text).toBe("うっちゃり！");
    expect(popOf({ type: "block", defender: 0, attacker: 1, isEdge: false, push: 10 })?.text).toBe("パリィ！");
  });

  it("自分がパリィしたときは返し突きを促し、相手がパリィしたときは息が減ると伝える", () => {
    expect(popOf({ type: "block", defender: 0, attacker: 1, isEdge: false, push: 0 })?.sub).toBe("返し突きのチャンス！");
    expect(popOf({ type: "block", defender: 1, attacker: 0, isEdge: false, push: 0 })?.sub).toBe("西が弾いた。東の息 −22");
  });

  it("いなしは『いなした！』、土俵際なら『うっちゃり！』", () => {
    expect(popOf({ type: "parry", defender: 1, attacker: 0, isEdge: false, isStance: false, push: 20 })).toMatchObject({ text: "いなした！", sub: "西が 20 押し返す" });
    expect(popOf({ type: "parry", defender: 1, attacker: 0, isEdge: true, isStance: false, push: 20 })?.text).toBe("うっちゃり！");
  });

  it("がっぷり開始は出すが、終了では出さない", () => {
    expect(popOf({ type: "clinch", isStart: true })?.text).toBe("がっぷり！");
    expect(popOf({ type: "clinch", isStart: false })).toBeNull();
  });

  it("がっぷりの勝敗：勝てば『寄り切った！』、負ければ『寄り切られた！』、互角は『分け』", () => {
    expect(popOf({ type: "clinchWin", winner: 0, loser: 1, push: 30, tapDiff: 3 })?.text).toBe("寄り切った！");
    expect(popOf({ type: "clinchWin", winner: 1, loser: 0, push: 30, tapDiff: 3 })?.text).toBe("寄り切られた！");
    expect(popOf({ type: "clinchWin", winner: null, loser: null, push: 0, tapDiff: 0 })?.text).toBe("分け");
  });

  it("必殺・相打ち・返し突きの文言", () => {
    expect(popOf({ type: "text", side: 1, text: "special" })).toMatchObject({ text: SPECIES[1].special.name, sub: "西の必殺！" });
    expect(popOf({ type: "text", side: 0, text: "aiuchi" })?.text).toBe("相打ち");
    expect(popOf({ type: "text", side: 0, text: "riposte" })?.text).toBe("返し突き");
  });

  it("相手の返し突き・相手の息切れは出さない（自分の判断に使う情報だけ）", () => {
    expect(popOf({ type: "text", side: 1, text: "riposte" })).toBeNull();
    expect(popOf({ type: "gas", side: 1 })).toBeNull();
    expect(popOf({ type: "gas", side: 0 })).toMatchObject({ text: "息切れ", tone: "warn" });
  });

  it("熱のポップは遅らせて出す（同時のパリィの文字に上書きされない）", () => {
    expect(popOf({ type: "hot", side: 0 })).toMatchObject({ text: "熱！", sub: "2.5秒間 畳みかけろ！", delayMs: HOT_POP_DELAY_MS });
    expect(popOf({ type: "hot", side: 1 })?.sub).toBe("西が勢いづいた！");
  });

  it("決着・構え・突進などはポップにしない", () => {
    expect(popOf({ type: "end", winner: 0 })).toBeNull();
    expect(popOf({ type: "lunge", side: 0 })).toBeNull();
  });
});

describe("repeatHintFor", () => {
  it("自分の同手連続だけ、倍率つきで返す", () => {
    expect(repeatHintFor({ type: "rep", side: 0, mult: 0.7 }, 0)).toBe("同じ手の連続 ×0.70");
    expect(repeatHintFor({ type: "rep", side: 1, mult: 0.7 }, 0)).toBeNull();
    expect(repeatHintFor({ type: "gas", side: 0 }, 0)).toBeNull();
  });
});
