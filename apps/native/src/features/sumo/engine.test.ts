import { describe, expect, it } from "vitest";
import { CFG, MODE_EARLY } from "./config";
import { act, clinchTap } from "./engine";
import { manualGame, runSteps } from "./test-helpers";

// 西の突き(構え430ms)は 26 ステップ目(約433ms)に発動する。
// 東は西の発動より前に守りを置いて、受付(240ms)の内か外かを作り分ける。
const STEPS_UNTIL_TSUKI_LANDS = 26;

describe("守り", () => {
  it("受付内に同じ側の突きが来るとパリィ成功になり、攻めた側が崩れる", () => {
    const { game, events } = manualGame();
    act(game, game.f[1], "tsuki", 0);
    runSteps(game, 18); // 約300ms待ってから置く → 発動時は置いてから約133ms
    act(game, game.f[0], "inashi", { dir: 0, dur: 5000 });
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS - 18);
    expect(events.filter((e) => e.type === "block")).toHaveLength(1);
  });

  it("パリィ成功で攻めた側の息が減り、弾いた側は返し突きが使える", () => {
    const { game } = manualGame();
    act(game, game.f[1], "tsuki", 0);
    runSteps(game, 18);
    act(game, game.f[0], "inashi", { dir: 0, dur: 5000 });
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS - 18);
    expect(game.f[0].riposte).toBeGreaterThan(0);
  });

  it("受付を過ぎて置いた同じ側の突きは、パリィではなくいなしになる", () => {
    const { game, events } = manualGame();
    act(game, game.f[1], "tsuki", 0);
    act(game, game.f[0], "inashi", { dir: 0, dur: 5000 }); // 発動時には置いて約433ms > 受付240ms
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS);
    expect(events.map((e) => e.type)).toEqual(["wind", "parry"]);
  });

  it("反対側を守っていると突きはそのまま当たる", () => {
    const { game, events } = manualGame();
    act(game, game.f[1], "tsuki", 0);
    act(game, game.f[0], "inashi", { dir: 6, dur: 5000 });
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS);
    expect(events.find((e) => e.type === "hit")).toMatchObject({ attacker: 1, defender: 0, hitType: "tsuki" });
  });

  it("序盤モードは受付が広く、受付外のタイミングでもパリィが成功する", () => {
    const { game, events } = manualGame({ mode: MODE_EARLY });
    act(game, game.f[1], "tsuki", 0);
    runSteps(game, 8); // 発動時は置いて約300ms: 本気(240ms)なら外れ、序盤(340ms)なら内
    act(game, game.f[0], "inashi", { dir: 0, dur: 5000 });
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS - 8);
    expect(events.some((e) => e.type === "block")).toBe(true);
  });
});

describe("相打ちとがっぷり", () => {
  it("突きが同時に発動すると相打ちになり、押しは発生しない", () => {
    const { game, events } = manualGame();
    act(game, game.f[0], "tsuki", 0);
    act(game, game.f[1], "tsuki", 6);
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS);
    expect(events.filter((e) => e.type === "text")).toEqual([{ type: "text", side: 0, text: "aiuchi" }]);
  });

  it("相打ちでは位置が動かない", () => {
    const { game } = manualGame();
    act(game, game.f[0], "tsuki", 0);
    act(game, game.f[1], "tsuki", 6);
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS);
    expect(game.target).toBe(0);
  });

  it("四つ同士がぶつかるとがっぷりになる", () => {
    const { game, events } = manualGame();
    clinchByBothGrabs(game);
    expect(events.at(-1)).toEqual({ type: "clinch", isStart: true });
  });

  it("がっぷりは連打数の多い側が終了時にまとめて押して勝つ", () => {
    const { game, events } = manualGame();
    clinchByBothGrabs(game);
    for (let i = 0; i < 10; i++) clinchTap(game, game.f[0]);
    for (let i = 0; i < 3; i++) clinchTap(game, game.f[1]);
    runSteps(game, 110); // 1.7秒を超えるまで
    expect(events.find((e) => e.type === "clinchWin")).toMatchObject({ winner: 0, loser: 1, tapDiff: 7 });
  });

  it("がっぷりの連打差が1.5未満なら分けになり押されない", () => {
    const { game, events } = manualGame();
    clinchByBothGrabs(game);
    clinchTap(game, game.f[0]);
    runSteps(game, 110);
    expect(events.find((e) => e.type === "clinchWin")).toMatchObject({ winner: null });
    expect(game.target).toBe(0);
  });
});

describe("うっちゃりと決着", () => {
  it("土俵際でパリィを決めるとうっちゃりで大きく押し返し、熱になる", () => {
    const { game, events } = manualGame();
    game.target = -(CFG.EDGE + 8); // 東(f[0])が土俵際
    act(game, game.f[1], "tsuki", 0);
    runSteps(game, 18);
    act(game, game.f[0], "inashi", { dir: 0, dur: 5000 });
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS - 18);
    expect(events.find((e) => e.type === "block")).toMatchObject({ defender: 0, isEdge: true });
    expect(game.f[0].hot).toBeGreaterThan(0);
    expect(game.lastKm).toBe("うっちゃり");
  });

  it("土俵際のいなしもうっちゃりになり、熱になる", () => {
    const { game, events } = manualGame();
    game.target = -(CFG.EDGE + 8);
    act(game, game.f[1], "tsuki", 0);
    act(game, game.f[0], "inashi", { dir: 0, dur: 5000 });
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS);
    expect(events.filter((e) => e.type === "hot")).toEqual([{ type: "hot", side: 0 }]);
    expect(game.lastKm).toBe("うっちゃり");
  });

  it("序盤モードは土俵際のいなしでも熱にならない", () => {
    const { game } = manualGame({ mode: MODE_EARLY });
    game.target = -(CFG.EDGE + 8);
    act(game, game.f[1], "tsuki", 0);
    act(game, game.f[0], "inashi", { dir: 0, dur: 5000 });
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS);
    expect(game.f[0].hot).toBe(0);
  });

  it("±130に達した側が負けて取組が終わる", () => {
    const { game, events } = manualGame();
    game.target = CFG.OUT - 10;
    act(game, game.f[0], "tsuki", 0);
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS);
    expect(events.find((e) => e.type === "end")).toEqual({ type: "end", winner: 0 });
    expect(game.phase).toBe("end");
  });

  it("決着後は手を受け付けない", () => {
    const { game } = manualGame();
    game.target = CFG.OUT - 10;
    act(game, game.f[0], "tsuki", 0);
    runSteps(game, STEPS_UNTIL_TSUKI_LANDS);
    expect(act(game, game.f[1], "tsuki", 0)).toBe(false);
  });
});

function clinchByBothGrabs(game: ReturnType<typeof manualGame>["game"]): void {
  act(game, game.f[0], "grab");
  act(game, game.f[1], "grab");
  act(game, game.f[0], "grabRelease");
  act(game, game.f[1], "grabRelease");
  runSteps(game, 50); // 溜め520ms＋踏み込み200ms ≒ 44ステップ
}
