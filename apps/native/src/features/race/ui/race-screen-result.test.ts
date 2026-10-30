import { describe, expect, it } from "vitest";
import { createSession, runFrame } from "../session";
import { buildResult, createTally, formatTime, tallyFrame } from "./race-screen-result";
import { buildSessionOptions, DEFAULT_SETUP } from "./race-screen-setup";
import { RACE_TIME_LIMIT_MS } from "./race-screen-timing";

const FRAME_SEC = 1 / 60;
const SEED = 20260101;

/** 何も入力しないまま、終わる（または時間切れの手前まで）回す。画面のループと同じ集計を通す */
function play(untilSec: number) {
  const options = buildSessionOptions(DEFAULT_SETUP, SEED);
  const session = createSession(options);
  const tally = createTally();
  for (let frame = 0; frame * FRAME_SEC < untilSec && !session.isOver; frame++) {
    const result = runFrame(session, { realDtSec: FRAME_SEC, nowMs: frame * FRAME_SEC * 1000, inputs: [] });
    tallyFrame(tally, result);
  }
  return { session, tally, options };
}

describe("tallyFrame", () => {
  it("区間の終わりごとに評価を積む", () => {
    const tally = createTally();

    tallyFrame(tally, { raceEvents: [], minigameEvents: [{ type: "end", zone: "dash", zoneIndex: 0, grade: "S", average: 0.9 }, { type: "dashTap" }] });

    expect(tally.zoneGrades).toEqual([{ zone: "dash", grade: "S" }]);
  });

  it("抜いた回数は順位が上がったときだけ、ぶつかった回数は自分が絡むときだけ数える", () => {
    const tally = createTally();

    tallyFrame(tally, {
      raceEvents: [
        { type: "rankChange", from: 5, to: 4 },
        { type: "rankChange", from: 4, to: 5 },
        { type: "bump", runners: [0, 2], impulse: 1, x: 0, y: 0, z: 0 },
        { type: "bump", runners: [3, 2], impulse: 1, x: 0, y: 0, z: 0 },
      ],
      minigameEvents: [],
    });

    expect([tally.overtakes, tally.bumps]).toEqual([1, 1]);
  });
});

describe("buildResult（最後まで走ったレース）", () => {
  const played = play(RACE_TIME_LIMIT_MS / 1000);
  const view = buildResult(played.session.race, played.tally, played.options.runnerNames, true);

  it("着順は1着から8着まで並び、タイムは昇順", () => {
    expect(view.rows.map((row) => row.place)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(view.rows.map((row) => row.timeSec)).toEqual([...view.rows.map((row) => row.timeSec)].sort((a, b) => a - b));
  });

  it("1着との差は1着が0で、他は0以上", () => {
    expect(view.rows[0].gapSec).toBe(0);
    expect(view.rows.every((row) => row.gapSec >= 0)).toBe(true);
  });

  it("自分の行は1つだけで「じぶん」と出る", () => {
    const players = view.rows.filter((row) => row.isPlayer);

    expect(players.map((row) => row.name)).toEqual(["じぶん"]);
    expect(players[0].place).toBe(view.playerPlace);
  });

  it("全員ゴールしていれば予想タイムの行はない", () => {
    expect(view.rows.some((row) => row.isEstimated)).toBe(false);
  });

  it("ミニゲームの評価が3つ並ぶ", () => {
    expect(view.zoneGrades).toHaveLength(3);
  });

  it("見出しは順位から決まる", () => {
    expect(view.title).toBe(view.playerPlace === 1 ? "1着！" : `${view.playerPlace}着`);
  });

  it("ぶつかり合いありのときだけ、ぶつかった回数を出す", () => {
    const without = buildResult(played.session.race, played.tally, played.options.runnerNames, false);
    const hasBumpLine = (lines: string[]) => lines.some((text) => text.startsWith("ぶつかった"));

    expect([hasBumpLine(view.highlights), hasBumpLine(without.highlights)]).toEqual([true, false]);
  });
});

describe("buildResult（途中で時間切れになったレース）", () => {
  const { session, tally, options } = play(5);
  const view = buildResult(session.race, tally, options.runnerNames, true);

  it("誰もゴールしていなくても、全員を予想タイムで並べる", () => {
    expect(view.rows).toHaveLength(8);
    expect(view.rows.every((row) => row.isEstimated && Number.isFinite(row.timeSec))).toBe(true);
  });
});

describe("formatTime", () => {
  it("小数第2位までの秒", () => {
    expect(formatTime(12.345)).toBe("12.35秒");
  });
});
