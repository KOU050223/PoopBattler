// 1フレームぶんの進行：入力 → ミニゲーム → step を n 回 → 実況。UI はこれを呼んで結果を再生するだけにする
import { createRaceClock, TIME_SCALE_HURDLE, TIME_SCALE_NORMAL, TIME_SCALE_PHOTO_FINISH, type RaceClock } from "./clock";
import { commentate, commentateRaceEnd, createCommentary, isPhotoFinishMoment, type CommentaryState } from "./commentary";
import { DIRECTOR } from "./config";
import { createRace, step, type RaceOptions } from "./engine";
import { applyInput, createOutput, enterZone, exitZone, updateMinigame, wantsHurdleSlow, type Minigame, type MinigameOutput } from "./minigames";
import type { MinigameEvent, Presentation, Race, RaceCommand, RaceEvent } from "./types";
import type { InputCommand } from "./ui/input";

const PLAYER_INDEX = 0;

export type TimeScaleReason = "hurdle" | "photoFinish" | null;

export interface RaceSession {
  race: Race;
  clock: RaceClock;
  commentary: CommentaryState;
  runnerNames: readonly string[];
  /** 今遊んでいる自分のミニゲーム。区間の外は null */
  minigame: Minigame | null;
  /** 次のステップでエンジンに渡す指示（入力で出たものが、ステップが無いフレームを越えて残る） */
  pendingCommands: RaceCommand[];
  /** 自分がゴールした実時間(ms)。残りの子を待つ猶予の起点 */
  playerFinishedAtMs: number | null;
  isOver: boolean;
}

export interface FrameInput {
  /** 前のフレームからの実時間(秒) */
  realDtSec: number;
  /** 今の実時間(ms)。InputCommand.atMs と同じ時計 */
  nowMs: number;
  inputs: readonly InputCommand[];
  /** カメラがアップを撮っているか */
  isCloseUp?: boolean;
}

export interface FrameResult {
  raceEvents: RaceEvent[];
  minigameEvents: MinigameEvent[];
  presentations: Presentation[];
  /** このフレームで clock に渡した時間倍率と、その理由 */
  timeScale: number;
  timeScaleReason: TimeScaleReason;
  /** 全員ゴールした、または自分のゴールから猶予が過ぎた。UI は結果へ移る */
  isOver: boolean;
}

export function createSession(options: RaceOptions & { runnerNames: readonly string[] }): RaceSession {
  return {
    race: createRace(options),
    clock: createRaceClock(),
    commentary: createCommentary(),
    runnerNames: options.runnerNames,
    minigame: null,
    pendingCommands: [],
    playerFinishedAtMs: null,
    isOver: false,
  };
}

/** ハードル直前のスロー → 写真判定のスローの順に優先する（試作と同じ） */
export function requestedTimeScale(session: RaceSession): { timeScale: number; reason: TimeScaleReason } {
  if (wantsHurdleSlow(session.minigame, session.race)) return { timeScale: TIME_SCALE_HURDLE, reason: "hurdle" };
  if (isPhotoFinishMoment(session.race)) return { timeScale: TIME_SCALE_PHOTO_FINISH, reason: "photoFinish" };
  return { timeScale: TIME_SCALE_NORMAL, reason: null };
}

/** 自分の区間の出入りでミニゲームを始める・終える */
function followPlayerZone(session: RaceSession, event: RaceEvent, out: MinigameOutput): void {
  if (event.type === "zoneExit" && event.runner === PLAYER_INDEX && session.minigame) {
    exitZone(session.minigame, event.zoneIndex, out);
    session.minigame = null;
  }
  if (event.type === "zoneEnter" && event.runner === PLAYER_INDEX) {
    const section = session.race.course.sections.find((entry) => entry.kind === "zone" && entry.zoneIndex === event.zoneIndex);
    if (section?.zone) session.minigame = enterZone(session.race, section.zone, event.zoneIndex, out);
  }
}

function checkOver(session: RaceSession, nowMs: number): boolean {
  const player = session.race.runners[PLAYER_INDEX];
  if (player.finishedAt !== null && session.playerFinishedAtMs === null) session.playerFinishedAtMs = nowMs;
  const isGraceOver = session.playerFinishedAtMs !== null && nowMs - session.playerFinishedAtMs > DIRECTOR.finishGraceMs;
  return session.race.isFinished || isGraceOver;
}

export function runFrame(session: RaceSession, input: FrameInput): FrameResult {
  const { race } = session;
  const { timeScale, reason } = requestedTimeScale(session);
  const steps = session.clock.advance(input.realDtSec, timeScale);
  const out = createOutput();

  if (session.minigame) {
    for (const command of input.inputs) applyInput(session.minigame, race, command, out);
  }
  session.pendingCommands.push(...out.commands.splice(0));

  const raceEvents: RaceEvent[] = [];
  for (let i = 0; i < steps; i++) {
    if (session.minigame) updateMinigame(session.minigame, race, input.nowMs, out);
    session.pendingCommands.push(...out.commands.splice(0));
    const events = step(race, session.pendingCommands.splice(0));
    raceEvents.push(...events);
    for (const event of events) followPlayerZone(session, event, out);
    session.pendingCommands.push(...out.commands.splice(0));
  }

  const presentations = commentate(session.commentary, {
    race,
    raceEvents,
    minigameEvents: out.events,
    nowMs: input.nowMs,
    runnerNames: session.runnerNames,
    isCloseUp: input.isCloseUp,
  });
  const isOver = checkOver(session, input.nowMs);
  if (isOver && !session.isOver) presentations.push(...commentateRaceEnd(session.commentary, race, input.nowMs));
  session.isOver = isOver;

  return { raceEvents, minigameEvents: out.events, presentations, timeScale, timeScaleReason: reason, isOver };
}
