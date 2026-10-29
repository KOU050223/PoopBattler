import { describe, expect, it } from "vitest";
import { commentate, commentateRaceEnd, createCommentary, isFinishApproach, isPhotoFinishMoment, type CommentaryInput } from "./commentary";
import { createRace } from "./engine";
import type { MinigameEvent, Presentation, Race, RaceEvent } from "./types";

const NAMES = ["うんちくん", "コロ丸", "ベン太", "ぽっとん", "カタ吉", "ゆる助", "モリ子", "ブリオ"];
const makeRace = (): Race => createRace({ seed: 20260101, racers: { player: { stamina: 5, power: 5, technique: 5 } }, collisions: false });

function input(race: Race, nowMs: number, raceEvents: RaceEvent[] = [], minigameEvents: MinigameEvent[] = []): CommentaryInput {
  return { race, raceEvents, minigameEvents, nowMs, runnerNames: NAMES };
}

const says = (presentations: Presentation[]) => presentations.flatMap((p) => (p.type === "say" ? [p.text] : []));
const bigTexts = (presentations: Presentation[]) => presentations.flatMap((p) => (p.type === "bigText" ? [p.text] : []));

const opponentWins: RaceEvent = { type: "finish", runner: 1, place: 1, time: 50 }; // 優先度2
const leaderChanged: RaceEvent = { type: "leaderChange", runner: 2 }; // 優先度1
const playerFinishes: RaceEvent = { type: "finish", runner: 0, place: 3, time: 60 }; // 優先度3

describe("実況のロック", () => {
  it("最初の発言は通る", () => {
    const state = createCommentary();

    expect(says(commentate(state, input(makeRace(), 0, [leaderChanged])))).toEqual(["ベン太がトップに立った！"]);
  });

  it("1秒のロック中は、今より優先度の低い発言を捨てる", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [opponentWins]));

    expect(says(commentate(state, input(race, 500, [leaderChanged])))).toEqual([]);
  });

  it("1秒のロック中でも、より高い優先度の発言は割り込む", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [opponentWins]));

    expect(says(commentate(state, input(race, 500, [playerFinishes])))).toEqual(["うんちくんは3着でゴール"]);
  });

  it("ロックが明ければ低い優先度も通る", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [opponentWins]));

    expect(says(commentate(state, input(race, 1001, [leaderChanged])))).toEqual(["ベン太がトップに立った！"]);
  });
});

describe("大きな文字", () => {
  const up: RaceEvent = { type: "rankChange", from: 5, to: 4 };

  it("順位の変化は0.9秒以内に2回出ない", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [up]));

    expect(bigTexts(commentate(state, input(race, 899, [{ type: "rankChange", from: 4, to: 3 }])))).toEqual([]);
  });

  it("0.9秒を過ぎれば次の順位の文字が出る", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [up]));

    expect(bigTexts(commentate(state, input(race, 901, [{ type: "rankChange", from: 4, to: 3 }])))).toEqual(["3位に浮上！"]);
  });

  it("1位になったら「トップ！」", () => {
    const state = createCommentary();

    expect(bigTexts(commentate(state, input(makeRace(), 0, [{ type: "rankChange", from: 2, to: 1 }])))).toEqual(["トップ！"]);
  });

  it("ゴツン！も順位の文字と間隔を共有する", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [up]));

    const bump: RaceEvent = { type: "bump", runners: [0, 3], impulse: 3, x: 0, y: 0, z: 0 };
    expect(bigTexts(commentate(state, input(race, 400, [bump])))).toEqual([]);
  });
});

describe("ぶつかった実況", () => {
  const others: RaceEvent = { type: "bump", runners: [2, 3], impulse: 3, x: 0, y: 0, z: 0 };

  it("自分以外の衝突は2秒に1回まで", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [others]));

    expect(says(commentate(state, input(race, 1500, [others])))).toEqual([]);
  });

  it("2秒を過ぎれば自分以外の衝突も実況する", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [others]));

    expect(says(commentate(state, input(race, 2100, [others])))).toEqual(["ベン太とぽっとんがぶつかった！"]);
  });
});

describe("スリップストリーム", () => {
  const draft: RaceEvent = { type: "draftStart", runner: 0 };

  it("3秒に1回まで", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [draft]));

    expect(says(commentate(state, input(race, 2500, [draft])))).toEqual([]);
  });

  it("ミニゲーム中は言わない", () => {
    const race = makeRace();
    race.runners[0].zoneIndex = 0;

    expect(says(commentate(createCommentary(), input(race, 0, [draft])))).toEqual([]);
  });
});

describe("ミニゲームの評価", () => {
  const end = (grade: "S" | "C"): MinigameEvent => ({ type: "end", zone: "hurdle", zoneIndex: 1, grade, average: 0.9 });

  it("Sランクはカットインを出す", () => {
    const out = commentate(createCommentary(), input(makeRace(), 0, [], [end("S")]));

    expect(out).toContainEqual({ type: "cutIn", name: "うんちくん", line: "ハードルパーフェクト！" });
  });

  it("Sランクの間は集中線を出す", () => {
    const out = commentate(createCommentary(), input(makeRace(), 0, [], [end("S")]));

    expect(out).toContainEqual({ type: "focusLines", on: true });
  });

  it("カットインが終わると集中線を消す", () => {
    const state = createCommentary();
    const race = makeRace();
    commentate(state, input(race, 0, [], [end("S")]));

    expect(commentate(state, input(race, 1200))).toContainEqual({ type: "focusLines", on: false });
  });

  it("Cランクの実況は「うーん、もう一息…」", () => {
    expect(says(commentate(createCommentary(), input(makeRace(), 0, [], [end("C")])))).toEqual(["うーん、もう一息…"]);
  });
});

describe("区間の予告とラストスパート", () => {
  it("区間の16m手前で「次は○○！」と予告する", () => {
    const race = makeRace();
    const zone = race.course.sections.find((section) => section.kind === "zone")!;
    race.runners[0].s = zone.startS - 15;

    expect(says(commentate(createCommentary(), input(race, 0)))).toEqual([`次は${{ dash: "ダッシュ", hurdle: "ハードル", bridge: "つり橋", swipe: "S字" }[zone.zone!]}！${{ dash: "連打！", hurdle: "タイミング！", bridge: "バランス！", swipe: "スワイプ！" }[zone.zone!]}`]);
  });

  it("予告は同じ区間で1回だけ", () => {
    const race = makeRace();
    const state = createCommentary();
    const zone = race.course.sections.find((section) => section.kind === "zone")!;
    race.runners[0].s = zone.startS - 15;
    commentate(state, input(race, 0));

    expect(says(commentate(state, input(race, 5000)))).toEqual([]);
  });

  it("先頭がゴールの40m手前より先に出るとラストスパートとシネスコ", () => {
    const race = makeRace();
    race.runners[3].s = race.course.finishS - 39;

    const out = commentate(createCommentary(), input(race, 0));

    expect([says(out), out.some((p) => p.type === "cinema" && p.on)]).toEqual([["ラストスパート！"], true]);
  });
});

describe("写真判定", () => {
  it("ゴールの10m手前で誰かが2.5m以内にいるとスローを求める", () => {
    const race = makeRace();
    race.runners[0].s = race.course.finishS - 9;
    race.runners[2].s = race.runners[0].s + 2.4;

    expect(isPhotoFinishMoment(race)).toBe(true);
  });

  it("2.5m 離れていればスローにしない", () => {
    const race = makeRace();
    race.runners[0].s = race.course.finishS - 9;
    race.runners[2].s = race.runners[0].s + 2.5;
    race.runners.filter((r) => r.index > 2).forEach((r) => (r.s = 0));
    race.runners[1].s = 0;

    expect(isPhotoFinishMoment(race)).toBe(false);
  });

  it("ゴールの10m より手前ではスローにしない", () => {
    const race = makeRace();
    race.runners[0].s = race.course.finishS - 11;
    race.runners[2].s = race.runners[0].s + 1;

    expect(isPhotoFinishMoment(race)).toBe(false);
  });

  it("着差が0.1秒未満なら「写真判定…」を出す", () => {
    const race = makeRace();
    race.runners.forEach((r) => (r.finishedAt = 40 + r.index));
    race.runners[0].finishedAt = 45;
    race.runners[2].finishedAt = 45.05;

    expect(commentateRaceEnd(createCommentary(), race, 0)).toContainEqual({ type: "photoFinish" });
  });

  it("着差が0.1秒以上なら写真判定は出さない", () => {
    const race = makeRace();
    race.runners.forEach((r) => (r.finishedAt = 40 + r.index));

    expect(commentateRaceEnd(createCommentary(), race, 0)).toEqual([]);
  });
});

describe("ゴール前の演出", () => {
  it("先頭がゴールの16m手前に来ると始まる", () => {
    const race = makeRace();
    race.runners[1].s = race.course.finishS - 15;

    expect(isFinishApproach(race)).toBe(true);
  });

  it("自分のゴールから2.5秒たつと終わる", () => {
    const race = makeRace();
    race.runners[1].s = race.course.finishS - 15;
    race.runners[0].finishedAt = 10;
    race.time = 12.6;

    expect(isFinishApproach(race)).toBe(false);
  });
});
