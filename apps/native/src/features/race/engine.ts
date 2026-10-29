// レースのシミュレーション（描画なし）。ブラウザ試作の step の移植。
// 実況・演出の文言は作らず、起きたことを RaceEvent として返すだけにする（race.md 7章の1）
import { STEP_SEC } from "./clock";
import { DIRECTOR, GRID, HURDLE, MINI_GAME, OPPONENT_STAT_SHAPES, PHYSICS, RUNNER_COUNT } from "./config";
import { resolveContacts, resolveWalls } from "./contact";
import { generateCourse } from "./course";
import { planOvertakes, draftAmount } from "./overtake";
import { advanceVelocity, derivePhysics, gradeAt, maxCurvatureAhead, targetSpeed } from "./physics";
import { createRng, pick, range, shuffle, type Rng } from "./rng";
import { steerHeading } from "./steering";
import type { Course, Race, RaceCommand, RaceEvent, Runner, RunnerStats } from "./types";

export interface RaceOptions {
  seed: number;
  /** 省くと seed からコースを作る */
  course?: Course;
  racers: {
    player: RunnerStats;
    /** 省くと race.md 3章のプリセットから作る。RUNNER_COUNT - 1 体 */
    opponents?: readonly RunnerStats[];
  };
  collisions: boolean;
  /** 全員のミニゲーム区間の出来をこの値に固定する（ミニゲーム本体が無い間のテスト用） */
  fixedPerf?: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const speedOf = (runner: Runner) => Math.hypot(runner.vx, runner.vz);

/** 相手のステータスは、プリセットの1つを選んで体力・パワー・技術の並びを入れ替えたもの */
function makeOpponentStats(rng: Rng): RunnerStats {
  const [stamina, power, technique] = shuffle(rng, pick(rng, OPPONENT_STAT_SHAPES));
  return { stamina, power, technique };
}

/** 5.3 相手の出来。一様乱数3つの和で、平均付近に寄せる */
function rollOpponentPerf(rng: Rng): number {
  const sum = rng() + rng() + rng();
  return clamp(
    MINI_GAME.oppPerfMean + (sum - 1.5) * MINI_GAME.oppPerfSpread,
    MINI_GAME.oppPerfMin,
    MINI_GAME.oppPerfMax,
  );
}

function createRunners(rng: Rng, course: Course, options: RaceOptions): Runner[] {
  const opponents = options.racers.opponents ?? Array.from({ length: RUNNER_COUNT - 1 }, () => makeOpponentStats(rng));
  const stats = [options.racers.player, ...opponents];
  const lanes = shuffle(rng, [...PHYSICS.laneOffsets]);
  const slots = GRID.rowsS.flatMap((s) => GRID.laterals.map((lat) => ({ s, lat })));
  // 自分は後列のどこか。残りの7体は余った枠をシャッフルして使う
  const rear = shuffle(rng, Array.from({ length: GRID.rearSlots }, (_, i) => i));
  const front = Array.from({ length: slots.length - GRID.rearSlots }, (_, i) => GRID.rearSlots + i);
  const slotOrder = [rear[0], ...shuffle(rng, [...rear.slice(1), ...front])];

  return stats.map((runnerStats, index) => {
    const slot = slots[slotOrder[index]];
    const point = course.points[slot.s];
    return {
      index,
      isPlayer: index === 0,
      stats: runnerStats,
      physics: derivePhysics(runnerStats),
      x: point.x - Math.sin(point.h) * slot.lat,
      z: point.z + Math.cos(point.h) * slot.lat,
      vx: 0,
      vz: 0,
      h: point.h,
      y: 0,
      trackIndex: slot.s,
      s: slot.s,
      lat: slot.lat,
      laneBase: lanes[index],
      passingIndex: null,
      passLat: 0,
      isDrafting: false,
      finishedAt: null,
      formPhase: range(rng, 0, Math.PI * 2),
      zoneIndex: -1,
      perf: MINI_GAME.perfStart,
      stumbleUntil: 0,
      boostUntil: 0,
      jumpUntil: 0,
      doneHurdles: [],
      bridgeNeedle: null,
      isAheadOfPlayer: false,
    };
  });
}

export function createRace(options: RaceOptions): Race {
  const rng = createRng(options.seed);
  const course = options.course ?? generateCourse(rng);
  const runners = createRunners(rng, course, options);
  const race: Race = {
    course,
    rng,
    time: 0,
    runners,
    collisions: options.collisions,
    fixedPerf: options.fixedPerf ?? null,
    order: [],
    playerRank: RUNNER_COUNT,
    leaderIndex: 0,
    isFinished: false,
  };
  for (const runner of runners) locate(race, runner);
  runners.forEach((runner) => {
    runner.isAheadOfPlayer = runner.s > runners[0].s;
  });
  race.order = rankOrder(runners);
  race.leaderIndex = race.order[0];
  race.playerRank = computePlayerRank(runners);
  return race;
}

/** 走者の現在地を中心線に当てはめる（距離・横位置・高さ） */
function locate(race: Race, runner: Runner): void {
  const { points } = race.course;
  const last = points.length - 1;
  let best = runner.trackIndex;
  let bestDistance = Infinity;
  const from = Math.max(0, runner.trackIndex - PHYSICS.trackSearchBehind);
  const to = Math.min(last, runner.trackIndex + PHYSICS.trackSearchAhead);
  for (let i = from; i <= to; i++) {
    const dx = runner.x - points[i].x;
    const dz = runner.z - points[i].z;
    const distance = dx * dx + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  runner.trackIndex = best;
  const point = points[best];
  const forwardX = Math.cos(point.h);
  const forwardZ = Math.sin(point.h);
  const dx = runner.x - point.x;
  const dz = runner.z - point.z;
  runner.s = point.s + dx * forwardX + dz * forwardZ;
  runner.lat = -dx * Math.sin(point.h) + dz * Math.cos(point.h);
  const next = points[Math.min(last, best + 1)];
  runner.y = point.y + (next.y - point.y) * clamp(dx * forwardX + dz * forwardZ, 0, 1);
}

function stumble(race: Race, runner: Runner, events: RaceEvent[]): void {
  runner.stumbleUntil = race.time + PHYSICS.stumbleDuration;
  events.push({ type: "stumble", runner: runner.index });
}

function jump(race: Race, runner: Runner, events: RaceEvent[]): void {
  runner.jumpUntil = race.time + HURDLE.jumpSec;
  events.push({ type: "jump", runner: runner.index });
}

function applyCommand(race: Race, command: RaceCommand, events: RaceEvent[]): void {
  const runner = race.runners[command.runner];
  switch (command.type) {
    case "setPerf":
      runner.perf = command.perf;
      break;
    case "jump":
      jump(race, runner, events);
      break;
    case "stumble":
      stumble(race, runner, events);
      break;
    case "boost":
      runner.boostUntil = race.time + command.durationSec;
      break;
    case "setBridgeNeedle":
      runner.bridgeNeedle = command.needle;
      break;
  }
}

function driveRunner(race: Race, runner: Runner, events: RaceEvent[]): void {
  const { points } = race.course;
  if (runner.trackIndex >= points.length - 2) {
    runner.vx *= PHYSICS.courseEndDamping;
    runner.vz *= PHYSICS.courseEndDamping;
    return;
  }
  const speed = speedOf(runner);
  runner.h = steerHeading({
    points,
    trackIndex: runner.trackIndex,
    x: runner.x,
    z: runner.z,
    heading: runner.h,
    speed,
    laneBase: runner.laneBase,
    passLat: runner.passingIndex !== null ? runner.passLat : null,
    bridgeNeedle: runner.bridgeNeedle,
    turn: runner.physics.turn,
    dt: STEP_SEC,
  });

  const draft = draftAmount(runner, race.runners);
  const wasDrafting = runner.isDrafting;
  runner.isDrafting = draft > 0;
  if (runner.isDrafting && !wasDrafting) events.push({ type: "draftStart", runner: runner.index });

  const target = targetSpeed({
    physics: runner.physics,
    point: points[runner.trackIndex],
    curvature: maxCurvatureAhead(points, runner.trackIndex),
    grade: gradeAt(points, runner.trackIndex),
    perf: runner.perf,
    time: race.time,
    formPhase: runner.formPhase,
    draft,
    isStumbling: race.time < runner.stumbleUntil,
    isBoosting: race.time < runner.boostUntil,
    isFinished: runner.finishedAt !== null,
  });
  Object.assign(runner, advanceVelocity(runner, runner.h, target, runner.physics, STEP_SEC));
}

function checkFinish(race: Race, runner: Runner, events: RaceEvent[]): void {
  if (runner.finishedAt !== null || runner.s < race.course.finishS) return;
  runner.finishedAt = race.time;
  const place = race.runners.filter((other) => other.finishedAt !== null).length;
  events.push({ type: "finish", runner: runner.index, place, time: race.time });
}

/** ミニゲーム区間の出入り。入った時点の perf は、相手なら乱数、自分なら開始値 */
function checkZone(race: Race, runner: Runner, events: RaceEvent[]): void {
  const point = race.course.points[runner.trackIndex];
  const zoneIndex = point.kind === "zone" && point.zoneIndex !== undefined ? point.zoneIndex : -1;
  if (zoneIndex === runner.zoneIndex) return;
  if (runner.zoneIndex >= 0) events.push({ type: "zoneExit", runner: runner.index, zoneIndex: runner.zoneIndex });
  runner.zoneIndex = zoneIndex;
  if (zoneIndex < 0) return;
  if (race.fixedPerf !== null) runner.perf = race.fixedPerf;
  else if (runner.isPlayer) runner.perf = point.zone === "dash" ? MINI_GAME.perfStartDash : MINI_GAME.perfStart;
  else runner.perf = rollOpponentPerf(race.rng);
  events.push({ type: "zoneEnter", runner: runner.index, zoneIndex });
}

/** 相手は2m手前で自動で跳ぶ。たまに失敗して転ぶ。自分のハードルはミニゲーム側が指示する */
function checkHurdles(race: Race, runner: Runner, events: RaceEvent[]): void {
  if (runner.isPlayer) return;
  const { hurdles } = race.course;
  const index = hurdles.findIndex((hurdle, i) => !runner.doneHurdles.includes(i) && hurdle.s > runner.s - 0.5);
  if (index < 0 || hurdles[index].s - runner.s >= HURDLE.oppJumpAhead) return;
  runner.doneHurdles.push(index);
  if (race.rng() < HURDLE.oppSuccessRate) jump(race, runner, events);
  else stumble(race, runner, events);
}

/** ゴールした順（ゴールタイム）→ まだの子は前にいる順 */
function rankOrder(runners: readonly Runner[]): number[] {
  return runners
    .slice()
    .sort((a, b) => {
      if (a.finishedAt !== null || b.finishedAt !== null) return (a.finishedAt ?? Infinity) - (b.finishedAt ?? Infinity);
      return b.s - a.s;
    })
    .map((runner) => runner.index);
}

/**
 * 自分の順位。相手とは rankSwapGap 以上離れたときだけ前後を入れ替える
 * （並走中に抜いた・抜かれたが連発しないように。race.md 6.2）
 */
function computePlayerRank(runners: readonly Runner[]): number {
  const player = runners[0];
  let rank = 1;
  for (const other of runners.slice(1)) {
    if (player.finishedAt !== null) {
      if (other.finishedAt !== null && other.finishedAt < player.finishedAt) rank++;
      continue;
    }
    if (other.finishedAt !== null) {
      rank++;
      continue;
    }
    if (other.s > player.s + DIRECTOR.rankSwapGap) other.isAheadOfPlayer = true;
    else if (other.s < player.s - DIRECTOR.rankSwapGap) other.isAheadOfPlayer = false;
    if (other.isAheadOfPlayer) rank++;
  }
  return rank;
}

function updateRanking(race: Race, events: RaceEvent[]): void {
  const rank = computePlayerRank(race.runners);
  if (rank !== race.playerRank) events.push({ type: "rankChange", from: race.playerRank, to: rank });
  race.playerRank = rank;
  race.order = rankOrder(race.runners);
  if (race.order[0] !== race.leaderIndex) events.push({ type: "leaderChange", runner: race.order[0] });
  race.leaderIndex = race.order[0];
  race.isFinished = race.runners.every((runner) => runner.finishedAt !== null);
}

/** 1ステップ（STEP_SEC）進める。入力は commands で渡し、起きたことを順に返す */
export function step(race: Race, commands: readonly RaceCommand[] = []): RaceEvent[] {
  const events: RaceEvent[] = [];
  const { runners } = race;
  const { points } = race.course;
  for (const command of commands) applyCommand(race, command, events);

  for (const runner of runners) locate(race, runner);
  planOvertakes(runners, points);
  for (const runner of runners) driveRunner(race, runner, events);
  for (const runner of runners) {
    runner.x += runner.vx * STEP_SEC;
    runner.z += runner.vz * STEP_SEC;
  }
  if (race.collisions) events.push(...resolveContacts(runners, points, race.time, race.rng));
  resolveWalls(runners, points);
  race.time += STEP_SEC;

  for (const runner of runners) {
    locate(race, runner);
    checkFinish(race, runner, events);
    checkZone(race, runner, events);
    checkHurdles(race, runner, events);
  }
  updateRanking(race, events);
  return events;
}
