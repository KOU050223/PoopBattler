// 実況と画面の表示の判定（race.md 6.2）。エンジンとミニゲームの出来事を受けて「何を言うか・何を大きく出すか」を
// 決めるだけで、描画・再生は UI の仕事。時間はすべて実時間 ms（スロー中でも画面での間隔を保つため）
import { DIRECTOR, MINI_GAME } from "./config";
import type { MiniGame, MinigameEvent, Presentation, Race, RaceEvent, SayPriority } from "./types";

const PLAYER_INDEX = 0;
const MIN_PROJECTION_SPEED = 5;

/** 区間の呼び名と、予告・操作パネルの掛け声（試作と同じ文字列） */
export const ZONE_LABELS: Record<MiniGame, { name: string; verb: string }> = {
  dash: { name: "ダッシュ", verb: "連打！" },
  hurdle: { name: "ハードル", verb: "タイミング！" },
  bridge: { name: "つり橋", verb: "バランス！" },
  swipe: { name: "S字", verb: "スワイプ！" },
};

const GRADE_COMMENTS = { A: "いい感じ！", B: "まずまず", C: "うーん、もう一息…" } as const;

export interface CommentaryState {
  sayLockUntilMs: number;
  sayPriority: SayPriority;
  /** 順位・ゴツン！の大きな文字を最後に出した時刻（この2つは同じ間隔を共有する。試作の lastFx） */
  lastBigTextMs: number;
  lastBumpSayMs: number;
  lastDraftSayMs: number;
  announcedZoneIndex: number;
  hasSaidFinalSpurt: boolean;
  cutInUntilMs: number;
  isFocusLines: boolean;
  isCinema: boolean;
}

export const createCommentary = (): CommentaryState => ({
  sayLockUntilMs: -Infinity,
  sayPriority: 1,
  lastBigTextMs: -Infinity,
  lastBumpSayMs: -Infinity,
  lastDraftSayMs: -Infinity,
  announcedZoneIndex: -1,
  hasSaidFinalSpurt: false,
  cutInUntilMs: -Infinity,
  isFocusLines: false,
  isCinema: false,
});

export interface CommentaryInput {
  race: Race;
  raceEvents: readonly RaceEvent[];
  minigameEvents: readonly MinigameEvent[];
  nowMs: number;
  /** 走者の番号 → 呼び名。0 番が自分 */
  runnerNames: readonly string[];
  /** カメラがアップを撮っているか（集中線が出る）。カメラ側の状態なので呼び出し側が渡す */
  isCloseUp?: boolean;
}

/**
 * 1秒のロック中は、今の発言より優先度が低いものを捨てる。
 * 同じ優先度は割り込める（試作の `prio < sayPrio` で捨てる判定どおり）
 */
function say(state: CommentaryState, out: Presentation[], nowMs: number, text: string, priority: SayPriority): void {
  if (nowMs < state.sayLockUntilMs && priority < state.sayPriority) return;
  state.sayLockUntilMs = nowMs + DIRECTOR.sayLockMs;
  state.sayPriority = priority;
  out.push({ type: "say", text, priority });
}

/** 順位変化とゴツン！は 0.9 秒に1回まで */
function bigTextLimited(state: CommentaryState, out: Presentation[], nowMs: number, text: string, isBad: boolean): void {
  if (nowMs - state.lastBigTextMs <= DIRECTOR.bigTextIntervalMs) return;
  state.lastBigTextMs = nowMs;
  out.push({ type: "bigText", text, isBad });
}

function onBump(state: CommentaryState, out: Presentation[], event: Extract<RaceEvent, { type: "bump" }>, input: CommentaryInput): void {
  const { race, nowMs, runnerNames } = input;
  const [a, b] = event.runners;
  if (a === PLAYER_INDEX || b === PLAYER_INDEX) {
    const other = a === PLAYER_INDEX ? b : a;
    bigTextLimited(state, out, nowMs, "ゴツン！", true);
    const isHeavier = race.runners[PLAYER_INDEX].physics.mass >= race.runners[other].physics.mass;
    say(state, out, nowMs, isHeavier ? `${runnerNames[other]}をはじき飛ばした！` : `${runnerNames[other]}にはじかれた！`, 2);
    return;
  }
  if (nowMs - state.lastBumpSayMs <= DIRECTOR.bumpSayIntervalMs) return;
  state.lastBumpSayMs = nowMs;
  say(state, out, nowMs, `${runnerNames[a]}と${runnerNames[b]}がぶつかった！`, 1);
}

function onRankChange(state: CommentaryState, out: Presentation[], event: Extract<RaceEvent, { type: "rankChange" }>, input: CommentaryInput): void {
  if (input.race.runners[PLAYER_INDEX].finishedAt !== null) return;
  const isUp = event.to < event.from;
  const text = isUp ? (event.to === 1 ? "トップ！" : `${event.to}位に浮上！`) : `${event.to}位に後退`;
  bigTextLimited(state, out, input.nowMs, text, !isUp);
  const name = input.runnerNames[PLAYER_INDEX];
  say(state, out, input.nowMs, isUp ? `${name}、${event.to}位に上がった！` : `抜かれて${event.to}位！`, 1);
}

function onFinish(state: CommentaryState, out: Presentation[], event: Extract<RaceEvent, { type: "finish" }>, input: CommentaryInput): void {
  const name = input.runnerNames[event.runner];
  if (event.runner === PLAYER_INDEX) {
    out.push({ type: "bigText", text: `${event.place}着！`, isBad: event.place !== 1 });
    say(state, out, input.nowMs, event.place === 1 ? `${name}、1着でゴール！` : `${name}は${event.place}着でゴール`, 3);
  } else if (event.place === 1) {
    say(state, out, input.nowMs, `${name}が1着でゴール！`, 2);
  }
}

function onRaceEvent(state: CommentaryState, out: Presentation[], event: RaceEvent, input: CommentaryInput): void {
  switch (event.type) {
    case "bump":
      onBump(state, out, event, input);
      return;
    case "rankChange":
      onRankChange(state, out, event, input);
      return;
    case "leaderChange":
      if (event.runner !== PLAYER_INDEX) say(state, out, input.nowMs, `${input.runnerNames[event.runner]}がトップに立った！`, 1);
      return;
    case "finish":
      onFinish(state, out, event, input);
      return;
    case "stumble":
      if (event.runner === PLAYER_INDEX) out.push({ type: "bigText", text: "ドテッ", isBad: true });
      return;
    case "draftStart": {
      const isRacing = input.race.runners[PLAYER_INDEX].zoneIndex < 0;
      if (event.runner !== PLAYER_INDEX || !isRacing || input.nowMs - state.lastDraftSayMs <= DIRECTOR.draftSayIntervalMs) return;
      state.lastDraftSayMs = input.nowMs;
      say(state, out, input.nowMs, "スリップストリームに入った！", 1);
      return;
    }
    default:
      return;
  }
}

function onMinigameEvent(state: CommentaryState, out: Presentation[], event: MinigameEvent, input: CommentaryInput): void {
  const { nowMs } = input;
  switch (event.type) {
    case "hurdleResult":
      if (event.judge === "perfect") out.push({ type: "bigText", text: "パーフェクト！", isBad: false });
      else if (event.judge === "good") out.push({ type: "bigText", text: "グッド", isBad: false });
      else if (event.judge === "tooEarly") out.push({ type: "bigText", text: "早すぎ！", isBad: true });
      return;
    case "arrowResult":
      if (event.judge === "fast") out.push({ type: "bigText", text: "キュッ！", isBad: false });
      else if (event.judge === "slow") out.push({ type: "bigText", text: "OK", isBad: false });
      else out.push({ type: "bigText", text: "ミス", isBad: true });
      return;
    case "end": {
      const zoneName = ZONE_LABELS[event.zone].name;
      out.push({ type: "bigText", text: `${zoneName} ${event.grade}`, isBad: event.grade === "C" });
      if (event.grade === "S") {
        state.cutInUntilMs = nowMs + DIRECTOR.cutInMs;
        out.push({ type: "cutIn", name: input.runnerNames[PLAYER_INDEX], line: `${zoneName}パーフェクト！` });
        say(state, out, nowMs, `${input.runnerNames[PLAYER_INDEX]}、${zoneName}を完璧に決めた！`, 2);
      } else {
        say(state, out, nowMs, GRADE_COMMENTS[event.grade], 1);
      }
      return;
    }
    default:
      return;
  }
}

const leaderDistance = (race: Race) => Math.max(...race.runners.map((runner) => runner.s));

/** ゴール前の演出区間か：先頭がゴールの16m手前に来てから、自分のゴール後2.5秒まで */
export function isFinishApproach(race: Race): boolean {
  const player = race.runners[PLAYER_INDEX];
  const isPlayerStillShown = player.finishedAt === null || race.time - player.finishedAt < DIRECTOR.finishAfterSec;
  return leaderDistance(race) > race.course.finishS - DIRECTOR.finishApproachAhead && isPlayerStillShown;
}

/** 区間の予告・ラストスパート・集中線・シネスコ。出来事ではなく今の状態から決まるもの */
function applySituation(state: CommentaryState, out: Presentation[], input: CommentaryInput): void {
  const { race, nowMs } = input;
  const player = race.runners[PLAYER_INDEX];

  const next = race.course.sections.find((section) => section.kind === "zone" && section.startS > player.s);
  if (next && next.zone && next.startS - player.s < MINI_GAME.announceAhead && state.announcedZoneIndex !== next.zoneIndex) {
    state.announcedZoneIndex = next.zoneIndex ?? -1;
    const label = ZONE_LABELS[next.zone];
    say(state, out, nowMs, `次は${label.name}！${label.verb}`, 2);
  }

  const leaderS = leaderDistance(race);
  if (!state.hasSaidFinalSpurt && race.course.finishS - leaderS < DIRECTOR.finalSpurtAhead) {
    state.hasSaidFinalSpurt = true;
    say(state, out, nowMs, "ラストスパート！", 2);
  }

  const isHot = player.zoneIndex >= 0 && player.perf >= DIRECTOR.focusLinesPerf;
  const isFocusLines = isHot || Boolean(input.isCloseUp) || nowMs < state.cutInUntilMs || isFinishApproach(race);
  if (isFocusLines !== state.isFocusLines) out.push({ type: "focusLines", on: isFocusLines });
  state.isFocusLines = isFocusLines;

  const isCinema = leaderS > race.course.finishS - DIRECTOR.finalSpurtAhead || isFinishApproach(race);
  if (isCinema !== state.isCinema) out.push({ type: "cinema", on: isCinema });
  state.isCinema = isCinema;
}

/** 1フレームぶんの出来事から、UI が再生する演出を決める */
export function commentate(state: CommentaryState, input: CommentaryInput): Presentation[] {
  const out: Presentation[] = [];
  for (const event of input.raceEvents) onRaceEvent(state, out, event, input);
  for (const event of input.minigameEvents) onMinigameEvent(state, out, event, input);
  applySituation(state, out, input);
  return out;
}

/** 写真判定のスロー：ゴールの10m手前で、まだゴールしていない誰かが2.5m以内にいる */
export function isPhotoFinishMoment(race: Race): boolean {
  const player = race.runners[PLAYER_INDEX];
  if (player.finishedAt !== null || player.s < race.course.finishS - DIRECTOR.photoFinishAhead) return false;
  return race.runners.some((runner) => !runner.isPlayer && runner.finishedAt === null && Math.abs(runner.s - player.s) < DIRECTOR.photoFinishGap);
}

/** ゴールしていない子は、残りの距離を今の速さで走った場合の時刻で見積もる */
function projectedFinishTimes(race: Race): number[] {
  return race.runners.map(
    (runner) =>
      runner.finishedAt ??
      race.time + Math.max(0, race.course.finishS - runner.s) / Math.max(MIN_PROJECTION_SPEED, Math.hypot(runner.vx, runner.vz)),
  );
}

/** ゴールタイムの差が0.1秒未満の相手がいるか */
export function isPhotoFinishResult(race: Race): boolean {
  const times = projectedFinishTimes(race);
  return times.slice(1).some((time) => Math.abs(time - times[PLAYER_INDEX]) < DIRECTOR.photoFinishCloseSec);
}

/** レースを終えるときに1回だけ呼ぶ。着差が小さければ「写真判定…」 */
export function commentateRaceEnd(state: CommentaryState, race: Race, nowMs: number): Presentation[] {
  if (!isPhotoFinishResult(race)) return [];
  const out: Presentation[] = [{ type: "photoFinish" }];
  say(state, out, nowMs, "ほぼ同時！写真判定へ…", 3);
  return out;
}
