import { describe, expect, it } from "vitest";
import { SPECIES } from "../config";
import { makeFighter } from "../engine";
import { manualGame } from "../test-helpers";
import type { Fighter, FighterState, Game } from "../types";
import { GAP, K, TOILET_X, TOP } from "./constants";
import { fallLoser, INITIAL_POSE_SMOOTHING, poseFighter, poseTarget, restingPosition, toWorld } from "./pose";

const game = (): Game => manualGame().game;
const fighterIn = (state: FighterState, patch: Partial<Fighter> = {}): Fighter => ({ ...makeFighter(0, SPECIES[0]), state, dur: 400, ...patch });

describe("poseTarget（状態ごと）", () => {
  it("windup（突き）は後ろへ引いて反り、琥珀色に光る", () => {
    const target = poseTarget(fighterIn("windup", { move: "tsuki", dir7: 0, t: 200 }), game(), 0);
    expect(target).toMatchObject({ fx: -0.125, glowColor: 0xffc23a, armY: 0.25 });
    expect(target.lz).toBeGreaterThan(0);
  });

  it("windup（四つ）は溜めに応じて潰れ、必殺なら紫に光る", () => {
    const grab = fighterIn("windup", { move: "grab", charge: 1 });
    expect(poseTarget(grab, game(), 0)).toMatchObject({ sq: 0.88, glowColor: 0xff4a2a });
    expect(poseTarget({ ...grab, special: true }, game(), 0).glowColor).toBe(0xa86df0);
  });

  it("windup の突き方向の腕だけが振りかぶられる", () => {
    const target = poseTarget(fighterIn("windup", { move: "tsuki", dir7: 0, t: 400 }), game(), 0);
    // dir7=0 は画面右。東の右腕(+1)だけ大きく振りかぶる（水平方向の突きなので振りは swing に出る）
    expect(target.swing[1]).toBeCloseTo(1.6);
    expect(target.swing[0]).toBe(target.armY);
  });

  it("西は突き方向の左右が鏡になる", () => {
    const west = { ...fighterIn("windup", { move: "tsuki", dir7: 0, t: 400 }), side: 1 as const };
    const target = poseTarget(west, game(), 0);
    expect(target.swing[0]).toBeCloseTo(1.6);
    expect(target.swing[1]).toBe(target.armY);
  });

  it("active（突き）は前へ踏み込み、腕を伸ばす", () => {
    expect(poseTarget(fighterIn("active", { move: "tsuki", dir7: 6 }), game(), 0)).toMatchObject({ fx: 0.55, lz: -0.35, armX: 0.62 });
  });

  it("parry は受付中だけ緑に光る", () => {
    expect(poseTarget(fighterIn("parry", { t: 100, parryAct: 240 }), game(), 0).glowColor).toBe(0x5cdc84);
    expect(poseTarget(fighterIn("parry", { t: 300, parryAct: 240 }), game(), 0).glow).toBe(0);
  });

  it("inashi は受付後に idir 側へずれて青く光る", () => {
    const right = poseTarget(fighterIn("inashi", { t: 300, parryAct: 240, idir: 0 }), game(), 0);
    expect(right).toMatchObject({ z: 0.55, glowColor: 0x5ab8ff });
    expect(poseTarget(fighterIn("inashi", { t: 300, parryAct: 240, idir: 6 }), game(), 0).z).toBe(-0.55);
  });

  it("inashi の受付中は方向側の腕でパリィの構えを取る", () => {
    const target = poseTarget(fighterIn("inashi", { t: 100, parryAct: 240, idir: 0 }), game(), 0);
    expect(target.glowColor).toBe(0x5cdc84);
    expect(target.swing[1]).toBeGreaterThan(target.swing[0]);
  });

  it("clinch は前へ寄って低く構える", () => {
    expect(poseTarget(fighterIn("clinch"), game(), 0)).toMatchObject({ lz: -0.3, armY: 0.25, sq: 0.95 });
  });

  it("stagger は後ろへよろめき、腕を上げる", () => {
    const target = poseTarget(fighterIn("stagger", { t: 0 }), game(), 0);
    expect(target).toMatchObject({ fx: -0.2, armY: 1.5 });
    expect(target.lz).toBeCloseTo(0.15);
  });

  it("熱の間は他に光る理由がなければ橙に光る", () => {
    const target = poseTarget(fighterIn("idle", { hot: 1000 }), game(), 0);
    expect(target.glowColor).toBe(0xff6a10);
  });

  it("立ち合い前は熱でも光らず、静かに構える", () => {
    const target = poseTarget(fighterIn("idle", { hot: 1000 }), game(), 0, true);
    expect(target).toMatchObject({ glow: 0, armY: 1.1 });
  });
});

describe("poseFighter", () => {
  const input = (fighter: Fighter, extra: object = {}) => ({ fighter, game: game(), nowMs: 0, dtMs: 16, yaw: 0, smoothing: INITIAL_POSE_SMOOTHING, ...extra });

  it("平滑化は目標へ少しだけ近づき、新しい状態を返す", () => {
    const result = poseFighter(input(fighterIn("clinch")));
    expect(result.smoothing.lz).toBeLessThan(0);
    expect(result.smoothing.lz).toBeGreaterThan(-0.3);
    expect(INITIAL_POSE_SMOOTHING.lz).toBe(0);
  });

  it("active は補間せず目標に一気に着く", () => {
    const result = poseFighter(input(fighterIn("active", { move: "tsuki", dir7: 0 })));
    expect(result.smoothing.fx).toBe(0.55);
  });

  it("潰れても体積を保つよう横を 1/√sq にする", () => {
    const { pose } = poseFighter(input(fighterIn("clinch"), { smoothing: { ...INITIAL_POSE_SMOOTHING, sq: 0.25 } }));
    expect(pose.leanScale.x).toBeGreaterThan(1);
  });

  it("西は向きが反転する", () => {
    const west = { ...makeFighter(1, SPECIES[1]) };
    expect(poseFighter(input(west)).pose.rotationY).toBeCloseTo(Math.PI);
  });
});

describe("位置→ワールド座標", () => {
  it("pos=0 の東西は ±GAP、高さは TOP", () => {
    expect(restingPosition(0, 0, 0)).toMatchObject({ x: -GAP, y: TOP });
    expect(restingPosition(0, 1, 0).x).toBe(GAP);
  });

  it("pos は K 倍してワールド距離になる", () => {
    expect(restingPosition(100, 0, 0).x).toBeCloseTo(100 * K - GAP);
  });

  it("前進 fx は攻める向きへ進む（西は -x 側）", () => {
    const game0 = game();
    const attack = (fighter: Fighter): Fighter => ({ ...fighter, state: "active", move: "tsuki", dir7: 0 });
    const east = poseFighter({ fighter: attack(game0.f[0]), game: game0, nowMs: 0, dtMs: 1000, yaw: 0, smoothing: { ...INITIAL_POSE_SMOOTHING, fx: 0.5 } });
    const west = poseFighter({ fighter: attack(game0.f[1]), game: game0, nowMs: 0, dtMs: 1000, yaw: 0, smoothing: { ...INITIAL_POSE_SMOOTHING, fx: 0.5 } });
    expect(east.pose.position.x).toBeGreaterThan(-GAP);
    expect(west.pose.position.x).toBeLessThan(GAP);
  });

  it("yaw で軸ごと回り、横ずれも回る", () => {
    const position = toWorld(2, 1, Math.PI / 2);
    expect(position.x).toBeCloseTo(1);
    expect(position.z).toBeCloseTo(-2);
  });
});

describe("fallLoser", () => {
  const from = { x: -1, y: TOP, z: 0.5 };

  it("決着直後は出発点にいる", () => {
    expect(fallLoser(from, 0, 0).position).toEqual({ x: -1, y: TOP, z: 0.5 });
  });

  it("途中は便器へ向かって跳ね上がる", () => {
    const mid = fallLoser(from, 0, 300);
    expect(mid.position.y).toBeGreaterThan(TOP);
    expect(mid.position.x).toBeLessThan(-1);
  });

  it("東の敗者は東の便器(-x)、西の敗者は西の便器(+x)へ落ちる", () => {
    expect(fallLoser(from, 0, 900).position.x).toBeCloseTo(-TOILET_X);
    expect(fallLoser({ ...from, x: 1 }, 1, 900).position.x).toBeCloseTo(TOILET_X);
  });

  it("最後は便器の中へ沈んで小さくなる", () => {
    const end = fallLoser(from, 0, 5000);
    expect(end.scale).toBeLessThan(1);
    expect(end.position.y).toBeLessThan(TOP);
    expect(end.progress).toBe(1);
  });
});
