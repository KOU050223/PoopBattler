import { describe, expect, it } from "vitest";
import { createSession, requestedTimeScale, runFrame, type FrameResult } from "./session";

const NAMES = ["うんちくん", "コロ丸", "ベン太", "ぽっとん", "カタ吉", "ゆる助", "モリ子", "ブリオ"];
const FRAME_SEC = 1 / 60;
const MAX_RACE_SEC = 90;
const SEED = 20260101;

function playWithoutInput(seed: number) {
  const session = createSession({ seed, racers: { player: { stamina: 5, power: 5, technique: 5 } }, collisions: true, runnerNames: NAMES });
  const results: FrameResult[] = [];
  let frame = 0;
  while (!session.isOver && frame * FRAME_SEC < MAX_RACE_SEC) {
    results.push(runFrame(session, { realDtSec: FRAME_SEC, nowMs: frame * FRAME_SEC * 1000, inputs: [] }));
    frame++;
  }
  return { session, results, seconds: frame * FRAME_SEC };
}

describe("何も入力しないプレイヤーの1レース", () => {
  const { session, results, seconds } = playWithoutInput(SEED);

  it("90秒以内に終わる", () => {
    expect(session.isOver && seconds <= MAX_RACE_SEC).toBe(true);
  });

  it("ミニゲームの評価が3回出る", () => {
    const ends = results.flatMap((result) => result.minigameEvents).filter((event) => event.type === "end");

    expect(ends).toHaveLength(3);
  });

  it("自分のゴールが実況される", () => {
    const texts = results.flatMap((result) => result.presentations).flatMap((p) => (p.type === "say" ? [p.text] : []));

    expect(texts.some((text) => text.startsWith("うんちくん") && text.includes("ゴール"))).toBe(true);
  });

  it("同じシードなら同じ結果になる", () => {
    const again = playWithoutInput(SEED);

    expect(again.session.race.runners.map((r) => r.finishedAt)).toEqual(session.race.runners.map((r) => r.finishedAt));
  });
});

describe("時間倍率の要求", () => {
  it("ふつうの場面では等倍", () => {
    const session = createSession({ seed: SEED, racers: { player: { stamina: 5, power: 5, technique: 5 } }, collisions: false, runnerNames: NAMES });

    expect(requestedTimeScale(session)).toEqual({ timeScale: 1, reason: null });
  });

  it("写真判定の場面では0.45", () => {
    const session = createSession({ seed: SEED, racers: { player: { stamina: 5, power: 5, technique: 5 } }, collisions: false, runnerNames: NAMES });
    session.race.runners[0].s = session.race.course.finishS - 5;
    session.race.runners[2].s = session.race.runners[0].s + 1;

    expect(requestedTimeScale(session)).toEqual({ timeScale: 0.45, reason: "photoFinish" });
  });
});
