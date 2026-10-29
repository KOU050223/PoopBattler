// タッチ入力 → レースへのコマンドの変換。画面にもロジックにも依存しない純関数だけを置く。
// gesture-handler でも素のタッチイベントでも、down / move / up を渡せばつながる。
// 仕様: docs/race.md 5章 / 7章の4・5

/** スワイプとみなす移動量(px) */
export const SWIPE_THRESHOLD_PX = 28;

/** ハードルのタップを受ける、次のハードルまでの最大距離(m)。これより遠いタップは誤タップ */
export const HURDLE_TAP_MAX_DISTANCE_M = 8;

export type HoldDir = -1 | 0 | 1;
export type SwipeDir = "up" | "down" | "left" | "right";

export type InputCommand =
  /** atMs は実時間。連打の速さを実時間で測るため（ゲーム内時間にしない） */
  | { type: "tap"; atMs: number }
  | { type: "hold"; dir: HoldDir }
  | { type: "swipe"; dir: SwipeDir };

export type TouchPhase =
  | { kind: "idle" }
  | { kind: "pressed"; startX: number; startY: number };

export interface TouchStep {
  phase: TouchPhase;
  commands: InputCommand[];
}

export const IDLE: TouchPhase = { kind: "idle" };

const none = (phase: TouchPhase): TouchStep => ({ phase, commands: [] });

/** 左右の判定。ちょうど中央は左扱い */
export function holdDirOfX(x: number, width: number): HoldDir {
  return x > width / 2 ? 1 : -1;
}

/** 移動量の大きい軸で向きを決める。しきい値に届かなければ null（=タップ） */
export function classifySwipe(dx: number, dy: number): SwipeDir | null {
  if (Math.hypot(dx, dy) < SWIPE_THRESHOLD_PX) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

/** 次のハードルまでの距離がこれ以内のタップだけを受ける。距離の計算はロジック側 */
export function shouldAcceptHurdleTap(distanceToHurdleM: number): boolean {
  return distanceToHurdleM <= HURDLE_TAP_MAX_DISTANCE_M;
}

export function touchDown(phase: TouchPhase, point: { x: number; y: number; width: number }): TouchStep {
  if (phase.kind !== "idle") return none(phase);
  return {
    phase: { kind: "pressed", startX: point.x, startY: point.y },
    commands: [{ type: "hold", dir: holdDirOfX(point.x, point.width) }],
  };
}

/** 長押しの向きは置いた位置で決まり、動かしても変わない。スワイプは離した時点で判定する */
export function touchMove(phase: TouchPhase): TouchStep {
  return none(phase);
}

export function touchUp(phase: TouchPhase, point: { x: number; y: number; atMs: number }): TouchStep {
  if (phase.kind !== "pressed") return none(IDLE);
  const swipe = classifySwipe(point.x - phase.startX, point.y - phase.startY);
  const gesture: InputCommand = swipe ? { type: "swipe", dir: swipe } : { type: "tap", atMs: point.atMs };
  return { phase: IDLE, commands: [{ type: "hold", dir: 0 }, gesture] };
}
