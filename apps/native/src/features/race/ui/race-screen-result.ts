// レースの結果の集計。フレームごとの出来事を数え、終わったときに着順・タイム・評価をまとめる（試作 showResult と同じ内容）
import { isPhotoFinishResult, ZONE_LABELS } from "../commentary";
import type { Grade, MiniGame, MinigameEvent, Race, RaceEvent } from "../types";
import { PLAYER_SHORT_NAME, statsLabel } from "./race-screen-setup";

const PLAYER_INDEX = 0;
/** ゴールしていない子の予想タイムに使う最低速度(m/s)。止まっていても無限大にならないように（commentary.ts と同じ値） */
const MIN_PROJECTION_SPEED_MPS = 5;

export interface ZoneGrade {
  zone: MiniGame;
  grade: Grade;
}

export interface RaceTally {
  zoneGrades: ZoneGrade[];
  overtakes: number;
  bumps: number;
}

export const createTally = (): RaceTally => ({ zoneGrades: [], overtakes: 0, bumps: 0 });

export function tallyFrame(tally: RaceTally, frame: { raceEvents: readonly RaceEvent[]; minigameEvents: readonly MinigameEvent[] }): void {
  for (const event of frame.raceEvents) {
    if (event.type === "rankChange" && event.to < event.from) tally.overtakes += 1;
    if (event.type === "bump" && event.runners.includes(PLAYER_INDEX)) tally.bumps += 1;
  }
  for (const event of frame.minigameEvents) {
    if (event.type === "end") tally.zoneGrades.push({ zone: event.zone, grade: event.grade });
  }
}

export interface ResultRow {
  place: number;
  /** Runner.index。表彰台で走者の見た目を引くのに使う */
  runnerIndex: number;
  name: string;
  statsText: string;
  timeSec: number;
  /** 1着との差。1着は 0 */
  gapSec: number;
  isPlayer: boolean;
  /** ゴールしていない（時間切れ）ので、今の速さからの予想タイム */
  isEstimated: boolean;
}

export interface RaceResultView {
  title: string;
  subtitle: string;
  playerPlace: number;
  rows: ResultRow[];
  zoneGrades: { name: string; grade: Grade }[];
  highlights: string[];
}

const formatSec = (sec: number): string => sec.toFixed(2);

export function buildResult(race: Race, tally: RaceTally, runnerNames: readonly string[], isCollisions: boolean): RaceResultView {
  const entries = race.runners.map((runner) => {
    const isEstimated = runner.finishedAt === null;
    const speed = Math.max(MIN_PROJECTION_SPEED_MPS, Math.hypot(runner.vx, runner.vz));
    const timeSec = runner.finishedAt ?? race.time + Math.max(0, race.course.finishS - runner.s) / speed;
    return { runner, timeSec, isEstimated };
  });
  // 同タイムは番号の小さい方（自分が先）に倒して、並びを毎回同じにする
  entries.sort((a, b) => a.timeSec - b.timeSec || a.runner.index - b.runner.index);

  const topSec = entries[0].timeSec;
  const rows: ResultRow[] = entries.map((entry, i) => ({
    place: i + 1,
    runnerIndex: entry.runner.index,
    name: entry.runner.isPlayer ? PLAYER_SHORT_NAME : (runnerNames[entry.runner.index] ?? `${entry.runner.index}番`),
    statsText: statsLabel(entry.runner.stats),
    timeSec: entry.timeSec,
    gapSec: entry.timeSec - topSec,
    isPlayer: entry.runner.isPlayer,
    isEstimated: entry.isEstimated,
  }));

  const player = rows.find((row) => row.isPlayer)!;
  const subtitle =
    player.place === 1
      ? `2着の${rows[1].name}に ${formatSec(rows[1].timeSec - player.timeSec)}秒差`
      : `1着の${rows[0].name}まで ${formatSec(player.gapSec)}秒`;

  const highlights = [
    `Sランク ${tally.zoneGrades.filter((entry) => entry.grade === "S").length}`,
    `抜いた回数 ${tally.overtakes}`,
    ...(isCollisions ? [`ぶつかった回数 ${tally.bumps}`] : []),
    ...(isPhotoFinishResult(race) ? ["写真判定"] : []),
  ];

  return {
    title: player.place === 1 ? "1着！" : `${player.place}着`,
    subtitle,
    playerPlace: player.place,
    rows,
    zoneGrades: tally.zoneGrades.map((entry) => ({ name: ZONE_LABELS[entry.zone].name, grade: entry.grade })),
    highlights,
  };
}

export const formatTime = (sec: number): string => `${formatSec(sec)}秒`;

/** 表彰台に上げる人数。issue #273 で「3位まで」と決めた */
export const PODIUM_SIZE = 3;

export interface PodiumView {
  /** 1〜3位（走者が3人未満ならその人数） */
  winners: ResultRow[];
  /** 表彰圏外のときだけ、自分の行。表彰台に立っていれば null */
  outsidePlayer: ResultRow | null;
}

export function buildPodium(result: RaceResultView): PodiumView {
  const winners = result.rows.slice(0, PODIUM_SIZE);
  const outsidePlayer = result.rows.slice(PODIUM_SIZE).find((row) => row.isPlayer) ?? null;
  return { winners, outsidePlayer };
}
