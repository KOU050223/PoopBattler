// 画面側の「レースの状態 → カメラ director への入力」。dev/race-3d.tsx と同じ組み立てに、カットインのきっかけを足したもの
import type { CameraInput, CameraPoint, CameraRunner, CameraTrigger } from "../camera";
import { HURDLE } from "../config";
import type { Presentation, Race, RaceEvent } from "../types";

const PLAYER_INDEX = 0;
/** ハードルを跳んだ直後（背後）でも「直前」とみなす余裕(m) */
const HURDLE_BEHIND_MARGIN_M = 0.5;
/** 名札を走者の頭上に置く高さ(m) */
export const RIVAL_LABEL_HEIGHT_M = 2.3;

/** 強いきっかけを優先する：ぶつかった > 抜いた > カットイン */
export function triggerOf(raceEvents: readonly RaceEvent[], presentations: readonly Presentation[]): CameraTrigger {
  if (raceEvents.some((event) => event.type === "bump" && event.runners.includes(PLAYER_INDEX))) return "bump";
  if (raceEvents.some((event) => event.type === "rankChange" && event.to < event.from)) return "overtake";
  if (presentations.some((presentation) => presentation.type === "cutIn")) return "cutin";
  return null;
}

export function nextZoneDistance(race: Race): number | null {
  const player = race.runners[PLAYER_INDEX];
  const next = race.course.sections.find((section) => section.kind === "zone" && section.startS > player.s);
  return next ? next.startS - player.s : null;
}

/** director に渡す走者。毎フレーム作り直さないよう、同じ配列の中身だけ書き換える */
export function syncCameraRunners(race: Race, cameraRunners: CameraRunner[]): CameraRunner[] {
  race.runners.forEach((runner, index) => {
    cameraRunners[index] = Object.assign(cameraRunners[index] ?? { x: 0, y: 0, z: 0, h: 0, s: 0, lat: 0, isFinished: false }, {
      x: runner.x,
      y: runner.y,
      z: runner.z,
      h: runner.h,
      s: runner.s,
      lat: runner.lat,
      isFinished: runner.finishedAt !== null,
    });
  });
  return cameraRunners;
}

function isHurdleAhead(race: Race): boolean {
  const player = race.runners[PLAYER_INDEX];
  return race.course.hurdles.some((hurdle, index) => {
    const distance = hurdle.s - player.s;
    return !player.doneHurdles.includes(index) && distance > -HURDLE_BEHIND_MARGIN_M && distance < HURDLE.slowAhead;
  });
}

export function cameraInputOf(race: Race, cameraRunners: CameraRunner[], aspect: number, isPreStart: boolean, trigger: CameraTrigger): CameraInput {
  const { points } = race.course;
  const coursePointAt = (s: number) => points[Math.min(points.length - 1, Math.max(0, Math.round(s)))];
  const pointAt = (s: number): CameraPoint => coursePointAt(s);
  const player = race.runners[PLAYER_INDEX];
  return {
    isPreStart,
    time: race.time,
    finishS: race.course.finishS,
    leaderS: race.runners[race.leaderIndex].s,
    playerFinishedAt: player.finishedAt,
    isHurdleSlow: isHurdleAhead(race),
    isInMiniGame: player.zoneIndex >= 0,
    distanceToNextZone: nextZoneDistance(race),
    trigger,
    runners: syncCameraRunners(race, cameraRunners),
    playerIndex: PLAYER_INDEX,
    pointAt,
    aspect,
    dashPerf: coursePointAt(player.s).zone === "dash" ? player.perf : 0,
  };
}
