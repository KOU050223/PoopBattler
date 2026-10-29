// 出来事（Presentation）→ 画面に出す表示の状態。描画は持たず、何がいつまで出るかだけを決める純関数。
// 時間は commentary.ts と同じ実時間 ms
import { DIRECTOR } from "../config";
import type { Presentation, SayPriority } from "../types";

/** 写真判定は commentary が文言を持たない（出来事だけ）ので、docs 6.2 の呼び名をここに置く */
export const PHOTO_FINISH_TEXT = "写真判定…";

export const OVERLAY_TIMING = {
  /** 実況の帯が出ている時間。次の発言が来れば置き換わる */
  sayMs: 2400,
  /**
   * 大きな文字。順位変化・ゴツン！は DIRECTOR.bigTextIntervalMs 以上あけて出るので、
   * それより短くしておけば順位の文字どうしは時間でも重ならない
   */
  bigTextMs: 800,
  photoFinishMs: 1800,
  cutInMs: DIRECTOR.cutInMs,
} as const;

interface Timed {
  /** 同じ文言が続いても演出を最初からやり直すための通し番号（React の key に使う） */
  id: number;
  untilMs: number;
}

export interface SayView extends Timed {
  text: string;
  priority: SayPriority;
}

export interface BigTextView extends Timed {
  text: string;
  isBad: boolean;
  /** 出ている長さ。弾んで出て、最後に消える動きの長さをこれに合わせる */
  durationMs: number;
}

export interface CutInView extends Timed {
  name: string;
  line: string;
}

export interface OverlayState {
  nextId: number;
  say: SayView | null;
  /** 画面中央は1枠だけ。新しい文字が来たら置き換える（重ねない） */
  bigText: BigTextView | null;
  cutIn: CutInView | null;
  isFocusLines: boolean;
  isCinema: boolean;
}

export const createOverlayState = (): OverlayState => ({
  nextId: 1,
  say: null,
  bigText: null,
  cutIn: null,
  isFocusLines: false,
  isCinema: false,
});

/** 1フレームぶんの Presentation を順に反映する。元の state は変えない */
export function applyPresentations(state: OverlayState, presentations: readonly Presentation[], nowMs: number): OverlayState {
  if (presentations.length === 0) return state;
  const next = { ...state };
  for (const presentation of presentations) {
    const id = next.nextId++;
    switch (presentation.type) {
      case "say":
        next.say = { id, text: presentation.text, priority: presentation.priority, untilMs: nowMs + OVERLAY_TIMING.sayMs };
        break;
      case "bigText":
        next.bigText = { id, text: presentation.text, isBad: presentation.isBad, durationMs: OVERLAY_TIMING.bigTextMs, untilMs: nowMs + OVERLAY_TIMING.bigTextMs };
        break;
      case "photoFinish":
        next.bigText = { id, text: PHOTO_FINISH_TEXT, isBad: false, durationMs: OVERLAY_TIMING.photoFinishMs, untilMs: nowMs + OVERLAY_TIMING.photoFinishMs };
        break;
      case "cutIn":
        next.cutIn = { id, name: presentation.name, line: presentation.line, untilMs: nowMs + OVERLAY_TIMING.cutInMs };
        break;
      case "focusLines":
        next.isFocusLines = presentation.on;
        break;
      case "cinema":
        next.isCinema = presentation.on;
        break;
    }
  }
  return next;
}

/** 時間が過ぎた表示を消す。何も消えなければ同じ参照を返す（無駄な再描画を避ける） */
export function expireOverlay(state: OverlayState, nowMs: number): OverlayState {
  const isSayDone = state.say !== null && state.say.untilMs <= nowMs;
  const isBigTextDone = state.bigText !== null && state.bigText.untilMs <= nowMs;
  const isCutInDone = state.cutIn !== null && state.cutIn.untilMs <= nowMs;
  if (!isSayDone && !isBigTextDone && !isCutInDone) return state;
  return {
    ...state,
    say: isSayDone ? null : state.say,
    bigText: isBigTextDone ? null : state.bigText,
    cutIn: isCutInDone ? null : state.cutIn,
  };
}

/** 次に表示が消える時刻。何も出ていなければ null（タイマーを張らなくてよい） */
export function nextExpiryMs(state: OverlayState): number | null {
  const times = [state.say?.untilMs, state.bigText?.untilMs, state.cutIn?.untilMs].filter((time): time is number => time !== undefined);
  return times.length === 0 ? null : Math.min(...times);
}

/** reduce motion のときに止める動き。コンポーネントはこの値だけを見て動かす */
export interface MotionPlan {
  /** 集中線が1周する秒数。null なら回さない */
  focusLinesSpinSec: number | null;
  isFocusLinesFlicker: boolean;
  /** 大きな文字が弾んで出る。false なら拡大せず出るだけ */
  isBigTextPop: boolean;
  /** 黒帯・カットインが滑って出入りする時間。0 なら即切り替え */
  cinemaSlideMs: number;
  cutInSlideMs: number;
  /** 連打の「＋」を散らす */
  isDashScatter: boolean;
}

const FOCUS_LINES_SPIN_SEC = 9;
const CINEMA_SLIDE_MS = 320;
const CUT_IN_SLIDE_MS = 200;

export function motionPlan(isMotionReduced: boolean): MotionPlan {
  if (isMotionReduced) {
    return { focusLinesSpinSec: null, isFocusLinesFlicker: false, isBigTextPop: false, cinemaSlideMs: 0, cutInSlideMs: 0, isDashScatter: false };
  }
  return {
    focusLinesSpinSec: FOCUS_LINES_SPIN_SEC,
    isFocusLinesFlicker: true,
    isBigTextPop: true,
    cinemaSlideMs: CINEMA_SLIDE_MS,
    cutInSlideMs: CUT_IN_SLIDE_MS,
    isDashScatter: true,
  };
}

export interface ScreenSize {
  width: number;
  height: number;
}

export interface RivalLabelPlacement {
  isVisible: boolean;
  x: number;
  y: number;
}

/**
 * 名札の中心を画面の内側に収める。カメラの背後・画面外にいる子は出さない。
 * ホストが毎フレーム UI スレッド（フレームコールバック）から呼べるよう worklet にしてある
 */
export function placeRivalLabel(
  point: { x: number; y: number; isVisible: boolean },
  screen: ScreenSize,
  label: { width: number; height: number },
): RivalLabelPlacement {
  "worklet";
  if (!point.isVisible) return { isVisible: false, x: 0, y: 0 };
  const halfWidth = label.width / 2;
  const halfHeight = label.height / 2;
  return {
    isVisible: true,
    x: Math.min(Math.max(point.x, halfWidth), screen.width - halfWidth),
    y: Math.min(Math.max(point.y, halfHeight), screen.height - halfHeight),
  };
}
