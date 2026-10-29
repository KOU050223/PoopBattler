// ハードル（タップ）。次のハードルまでの距離 d でタイミングを判定する（race.md 5.2）
import { HURDLE } from "../config";
import { shouldAcceptHurdleTap } from "../ui/input";
import type { HurdleJudge, Race } from "../types";
import { mean, PLAYER_INDEX, type MinigameOutput } from "./shared";

/** ハードルを通り過ぎたとみなす距離。ここまで跳ばなければミス */
const PASSED_DISTANCE = -0.2;
/** 早跳びの転倒は、着地した先（ハードルの位置）の手前この距離で起こす */
const TRIP_LEAD = 0.2;
/** 次のハードルとして数える範囲の後ろ側（ちょうど通り過ぎる直前まで） */
const NEXT_BEHIND = 0.5;

export interface HurdleState {
  kind: "hurdle";
  perf: number;
  results: number[];
  /** 通過済みの Course.hurdles の番号 */
  doneIndices: number[];
  /** 早跳びで転ぶ位置。転ぶまで入る */
  tripS: number | null;
}

export const beginHurdle = (startPerf: number): HurdleState => ({
  kind: "hurdle",
  perf: startPerf,
  results: [],
  doneIndices: [],
  tripS: null,
});

export function judgeHurdleTap(distance: number): { judge: HurdleJudge; perf: number } {
  const { perfect, good } = HURDLE;
  if (distance >= perfect.min && distance <= perfect.max) return { judge: "perfect", perf: perfect.perf };
  if (distance >= good.min && distance <= good.max) return { judge: "good", perf: good.perf };
  return { judge: "tooEarly", perf: HURDLE.tooEarlyPerf };
}

function nextHurdleIndex(state: HurdleState, race: Race): number {
  const player = race.runners[PLAYER_INDEX];
  return race.course.hurdles.findIndex((entry, i) => !state.doneIndices.includes(i) && entry.s > player.s - NEXT_BEHIND);
}

/** 次のハードルまでの距離。残りが無ければ null */
export function nextHurdleDistance(state: HurdleState, race: Race): number | null {
  const index = nextHurdleIndex(state, race);
  return index < 0 ? null : race.course.hurdles[index].s - race.runners[PLAYER_INDEX].s;
}

function record(state: HurdleState, hurdleIndex: number, judge: HurdleJudge, perf: number, out: MinigameOutput): void {
  state.doneIndices.push(hurdleIndex);
  state.results.push(perf);
  state.perf = mean(state.results);
  out.commands.push({ type: "setPerf", runner: PLAYER_INDEX, perf: state.perf });
  out.events.push({ type: "hurdleResult", judge, perf });
}

export function tapHurdle(state: HurdleState, race: Race, out: MinigameOutput): void {
  const player = race.runners[PLAYER_INDEX];
  const hurdleIndex = nextHurdleIndex(state, race);
  if (hurdleIndex < 0 || race.time < player.jumpUntil) return;
  const distance = race.course.hurdles[hurdleIndex].s - player.s;
  if (!shouldAcceptHurdleTap(distance)) return; // 遠い誤タップは数えない

  const { judge, perf } = judgeHurdleTap(distance);
  out.commands.push({ type: "jump", runner: PLAYER_INDEX });
  if (judge === "perfect") out.commands.push({ type: "boost", runner: PLAYER_INDEX, durationSec: HURDLE.perfect.boostSec });
  if (judge === "tooEarly") state.tripS = race.course.hurdles[hurdleIndex].s;
  record(state, hurdleIndex, judge, perf, out);
}

/** 早跳びの転倒と、跳ばずに通り過ぎたミス */
export function updateHurdle(state: HurdleState, race: Race, out: MinigameOutput): void {
  const player = race.runners[PLAYER_INDEX];
  if (state.tripS !== null && player.s >= state.tripS - TRIP_LEAD) {
    state.tripS = null;
    out.commands.push({ type: "stumble", runner: PLAYER_INDEX });
  }
  const hurdleIndex = nextHurdleIndex(state, race);
  if (hurdleIndex < 0 || race.course.hurdles[hurdleIndex].s - player.s >= PASSED_DISTANCE) return;
  out.commands.push({ type: "stumble", runner: PLAYER_INDEX });
  record(state, hurdleIndex, "miss", HURDLE.missPerf, out);
}

/** ハードルの7m手前から通過直後までスローを求める */
export function isHurdleSlowMoment(state: HurdleState, race: Race): boolean {
  const distance = nextHurdleDistance(state, race);
  return distance !== null && distance < HURDLE.slowAhead && distance > -NEXT_BEHIND;
}

export const hurdleAverage = (state: HurdleState) => (state.results.length ? mean(state.results) : HURDLE.missPerf);
