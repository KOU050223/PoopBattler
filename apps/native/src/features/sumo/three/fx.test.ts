import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { manualGame } from "../test-helpers";
import { addYaw } from "./camera";
import { TOILET_X, TOP } from "./constants";
import { planFx } from "./fx";

const plan = (event: Parameters<typeof planFx>[0], patch?: (game: ReturnType<typeof manualGame>["game"]) => void) => {
  const { game } = manualGame();
  patch?.(game);
  return planFx(event, game, createRng(7));
};

describe("planFx hit", () => {
  it("軽い突きは小さな演出で、ヒットストップ 60ms", () => {
    const result = plan({ type: "hit", attacker: 0, defender: 1, hitType: "tsuki", push: 16 });
    expect(result).toMatchObject({ hitStopMs: 60, shake: 0.18, speedLines: "none" });
    expect(result.bursts[0].count).toBe(14);
  });

  it("四つ系の当たりは重く、集中線とヒットストップ 90ms", () => {
    const result = plan({ type: "hit", attacker: 0, defender: 1, hitType: "grab", push: 26 });
    expect(result).toMatchObject({ hitStopMs: 90, shake: 0.3, speedLines: "hit" });
    expect(result.bursts[0].count).toBe(24);
  });

  it("返し突き(ripHit)の突きは重く、緑がかった色", () => {
    const result = plan({ type: "hit", attacker: 0, defender: 1, hitType: "tsuki", push: 30 }, (game) => {
      game.f[0].ripHit = true;
    });
    expect(result.bursts[0].color).toBe(0x9fffc8);
    expect(result.speedLines).toBe("hit");
  });

  it("土煙は押された側の足元に出る", () => {
    const result = plan({ type: "hit", attacker: 0, defender: 1, hitType: "tsuki", push: 16 });
    expect(result.dusts[0].position.x).toBeGreaterThan(0);
    expect(result.dusts[0].position.y).toBeCloseTo(TOP + 0.1);
  });

  it("右への突きは東なら +0.42 回り込む", () => {
    const result = plan({ type: "hit", attacker: 0, defender: 1, hitType: "tsuki", push: 16 }, (game) => {
      game.f[0].dir7 = 0;
    });
    expect(result.yawDelta).toBeCloseTo(0.42);
  });

  it("西の同じ方向の突きは逆に回り込む", () => {
    const result = plan({ type: "hit", attacker: 1, defender: 0, hitType: "tsuki", push: 16 }, (game) => {
      game.f[1].dir7 = 0;
    });
    expect(result.yawDelta).toBeCloseTo(-0.42);
  });

  it("上突き(dir7=3)は回り込まない", () => {
    const result = plan({ type: "hit", attacker: 0, defender: 1, hitType: "tsuki", push: 16 }, (game) => {
      game.f[0].dir7 = 3;
    });
    expect(result.yawDelta).toBe(0);
  });

  it("回り込みは加算後に ±1.3 へ丸められる", () => {
    const result = plan({ type: "hit", attacker: 0, defender: 1, hitType: "tsuki", push: 16 }, (game) => {
      game.f[0].dir7 = 0;
    });
    expect(addYaw(1.2, result.yawDelta)).toBe(1.3);
  });
});

describe("planFx block / parry", () => {
  it("block は閃光・スローモー・FOVキックを出し、ヒットストップはなし", () => {
    const result = plan({ type: "block", defender: 0, attacker: 1, isEdge: false, push: 10 });
    expect(result).toMatchObject({ slowmoMs: 720, fovKick: 8, hasScreenFlash: true, speedLines: "parry", hitStopMs: 0, shake: 0.22 });
    expect(result.lightFlash?.intensity).toBe(6);
  });

  it("土俵際の block(うっちゃり) は大きな演出", () => {
    const result = plan({ type: "block", defender: 0, attacker: 1, isEdge: true, push: 10 });
    expect(result).toMatchObject({ slowmoMs: 950, fovKick: 11, shake: 0.35 });
    expect(result.lightFlash?.intensity).toBe(9);
    expect(result.bursts.some((spec) => spec.color === 0xffd25e)).toBe(true);
  });

  it("通常のいなしはスローモーも閃光も出さない", () => {
    const result = plan({ type: "parry", defender: 0, attacker: 1, isEdge: false, isStance: false, push: 10 });
    expect(result).toMatchObject({ slowmoMs: 0, hasScreenFlash: false, hitStopMs: 90, shake: 0.14 });
  });

  it("土俵際のいなし(うっちゃり)は大きなパリィ演出になる", () => {
    const result = plan({ type: "parry", defender: 0, attacker: 1, isEdge: true, isStance: false, push: 10 });
    expect(result).toMatchObject({ slowmoMs: 950, fovKick: 11, shake: 0.4, hasScreenFlash: true });
  });

  it("いなした方向へ回り込む（東が右を構えていれば −0.35）", () => {
    const result = plan({ type: "parry", defender: 0, attacker: 1, isEdge: false, isStance: false, push: 10 }, (game) => {
      game.f[0].idir = 0;
    });
    expect(result.yawDelta).toBeCloseTo(-0.35);
  });

  it("上方向(idir=3)のいなしは回り込まない", () => {
    const result = plan({ type: "parry", defender: 0, attacker: 1, isEdge: false, isStance: false, push: 10 }, (game) => {
      game.f[0].idir = 3;
    });
    expect(result.yawDelta).toBe(0);
  });
});

describe("planFx その他", () => {
  it("end の水しぶきは敗者側の便器に出る（東が勝てば西の +x）", () => {
    const result = plan({ type: "end", winner: 0 });
    expect(result.bursts[0].position).toEqual({ x: TOILET_X, y: 1.0, z: 0 });
    expect(result.rings[0]).toMatchObject({ isFlat: true, delayMs: 650 });
    expect(result.bursts[0]).toMatchObject({ shape: "drop", count: 40, delayMs: 650 });
  });

  it("西が勝てば東の便器(-x)に出る", () => {
    expect(plan({ type: "end", winner: 1 }).bursts[0].position.x).toBe(-TOILET_X);
  });

  it("clinchWin は勝者がいれば重い演出、分けなら何も出さない", () => {
    const win = plan({ type: "clinchWin", winner: 0, loser: 1, push: 40, tapDiff: 3 });
    expect(win).toMatchObject({ hitStopMs: 110, shake: 0.34, speedLines: "hit" });
    expect(plan({ type: "clinchWin", winner: null, loser: null, push: 0, tapDiff: 0 }).bursts).toEqual([]);
  });

  it("clinch は始まりだけ演出する", () => {
    expect(plan({ type: "clinch", isStart: true }).rings).toHaveLength(1);
    expect(plan({ type: "clinch", isStart: false }).rings).toHaveLength(0);
  });

  it("hot は熱を持った側から炎色の輪と粒が上がる", () => {
    const result = plan({ type: "hot", side: 1 });
    expect(result.bursts[0]).toMatchObject({ count: 30, gravity: -2 });
    expect(result.bursts[0].position.x).toBeGreaterThan(0);
  });

  it("lunge は足元に小さな土煙", () => {
    expect(plan({ type: "lunge", side: 0 }).dusts[0]).toMatchObject({ count: 4, spread: 1.6 });
  });

  it("演出のないイベントは空の計画", () => {
    const result = plan({ type: "gas", side: 0 });
    expect(result).toMatchObject({ bursts: [], rings: [], dusts: [], shake: 0, slowmoMs: 0, hitStopMs: 0 });
  });

  it("同じ乱数なら同じ計画（Math.random に頼らない）", () => {
    const event = { type: "hit", attacker: 0, defender: 1, hitType: "grab", push: 20 } as const;
    expect(plan(event)).toEqual(plan(event));
  });

  it("実際の位置を渡せばそこを基準にする", () => {
    const { game } = manualGame();
    const result = planFx({ type: "lunge", side: 0 }, game, createRng(1), {
      positions: [
        { x: 5, y: TOP, z: 3 },
        { x: 6, y: TOP, z: 3 },
      ],
    });
    expect(result.dusts[0].position).toMatchObject({ x: 5, z: 3 });
  });
});

