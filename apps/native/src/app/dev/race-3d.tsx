import { useEffect, useMemo, useRef } from "react";
import { View, type LayoutChangeEvent } from "react-native";

import { createCameraDirector, type CameraInput, type CameraRunner, type CameraOutput, type CameraTrigger } from "@/features/race/camera";
import { createRace, createRaceClock, createRng, step, type Race, type RaceEvent } from "@/features/race";
import { HURDLE } from "@/features/race/config";
import { RaceStage3D } from "@/features/race/three/RaceStage3D";
import { useReducedMotion } from "@/features/sumo/ui/use-reduced-motion";

const RACE_SEED = 20260101;
const DIRECTOR_SEED = 7;
/** NPC だけで回すので、ミニゲームの出来を全員この値に固定する */
const FIXED_PERF = 0.72;
const STATS = { stamina: 6, power: 6, technique: 6 };
/** スタート前に集団を周回して見せる実時間（秒） */
const PRE_START_SEC = 3;
/** ゴールしてもこの間は回し続けて、ゴール後のカメラまで見る */
const AFTER_FINISH_SEC = 4;
const INITIAL_ASPECT = 9 / 16;

function createDevRace(): Race {
  return createRace({ seed: RACE_SEED, racers: { player: STATS }, collisions: true, fixedPerf: FIXED_PERF });
}

function nextZoneDistance(race: Race): number | null {
  const player = race.runners[0];
  const next = race.course.sections.find((section) => section.kind === "zone" && section.startS > player.s);
  return next ? next.startS - player.s : null;
}

function triggerOf(events: readonly RaceEvent[]): CameraTrigger {
  if (events.some((event) => event.type === "bump" && event.runners.includes(0))) return "bump";
  if (events.some((event) => event.type === "rankChange" && event.to < event.from)) return "overtake";
  return null;
}

/** director に渡す走者。毎フレーム作り直さないよう、同じ配列の中身だけ書き換える */
function syncCameraRunners(race: Race, cameraRunners: CameraRunner[]): CameraRunner[] {
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

function cameraInputOf(race: Race, cameraRunners: CameraRunner[], aspect: number, isPreStart: boolean, trigger: CameraTrigger): CameraInput {
  const { points } = race.course;
  const player = race.runners[0];
  const point = points[Math.min(points.length - 1, Math.max(0, Math.round(player.s)))];
  const hurdleAhead = race.course.hurdles.some((hurdle, index) => !player.doneHurdles.includes(index) && hurdle.s - player.s > -0.5 && hurdle.s - player.s < HURDLE.slowAhead);
  return {
    isPreStart,
    time: race.time,
    finishS: race.course.finishS,
    leaderS: race.runners[race.leaderIndex].s,
    playerFinishedAt: player.finishedAt,
    isHurdleSlow: hurdleAhead,
    isInMiniGame: player.zoneIndex >= 0,
    distanceToNextZone: nextZoneDistance(race),
    trigger,
    runners: syncCameraRunners(race, cameraRunners),
    playerIndex: 0,
    pointAt: (s: number) => points[Math.min(points.length - 1, Math.max(0, Math.round(s)))],
    aspect,
    dashPerf: point.zone === "dash" ? player.perf : 0,
  };
}

/** レースの 3D ステージ確認用。dev 専用。NPC だけのレースを固定ステップで回し、director で撮ってゴールまで再生する */
export default function Race3dScreen() {
  const isReducedMotion = useReducedMotion();
  const raceRef = useRef<Race>(null as unknown as Race);
  raceRef.current ??= createDevRace();
  const cameraRef = useRef<CameraOutput | null>(null);
  const aspectRef = useRef(INITIAL_ASPECT);

  const clock = useMemo(() => createRaceClock(), []);
  const director = useMemo(() => createCameraDirector(createRng(DIRECTOR_SEED)), []);

  useEffect(() => {
    let frameId = 0;
    let lastMs: number | null = null;
    let elapsedSec = 0;
    let finishedForSec = 0;
    const cameraRunners: CameraRunner[] = [];
    const tick = (nowMs: number) => {
      const dtSec = lastMs === null ? 0 : (nowMs - lastMs) / 1000;
      lastMs = nowMs;
      elapsedSec += dtSec;
      const race = raceRef.current;
      const isPreStart = elapsedSec < PRE_START_SEC;
      let trigger: CameraTrigger = null;
      if (!isPreStart) {
        const steps = clock.advance(dtSec);
        const events: RaceEvent[] = [];
        for (let i = 0; i < steps; i++) events.push(...step(race));
        trigger = triggerOf(events);
      }
      if (race.isFinished) finishedForSec += dtSec;
      cameraRef.current = director.update(cameraInputOf(race, cameraRunners, aspectRef.current, isPreStart, trigger), Math.min(dtSec, 0.05));
      if (finishedForSec < AFTER_FINISH_SEC) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [clock, director]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (height > 0) aspectRef.current = width / height;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#ffe0ef" }} onLayout={onLayout}>
      <RaceStage3D raceRef={raceRef} cameraRef={cameraRef} isReducedMotion={isReducedMotion} />
    </View>
  );
}
