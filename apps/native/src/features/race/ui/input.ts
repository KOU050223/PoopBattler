// タッチ入力 → レースへのコマンドの変換。画面にもロジックにも依存しない純関数だけを置く。
// gesture-handler でも素のタッチイベントでも、down / move / up を渡せばつながる。
// 仕様: docs/race.md 5章 / 7章の4・5。試作の bindInput（pointerdown / pointerup / pointercancel）と同じタイミングで出す

/** スワイプとみなす移動量(px)。これを「超えた」ときだけ（ちょうどは含まない） */
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

/** 左右の判定。ちょうど中央は右扱い（試作は x/width < 0.5 だけが左） */
export function holdDirOfX(x: number, width: number): HoldDir {
  return x / width < 0.5 ? -1 : 1;
}

/** 移動量の大きい軸で向きを決める。しきい値に届かなければ null（=タップ） */
export function classifySwipe(dx: number, dy: number): SwipeDir | null {
  if (Math.hypot(dx, dy) <= SWIPE_THRESHOLD_PX) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

/** 次のハードルまでの距離がこれ以内のタップだけを受ける。距離の計算はロジック側 */
export function shouldAcceptHurdleTap(distanceToHurdleM: number): boolean {
  return distanceToHurdleM <= HURDLE_TAP_MAX_DISTANCE_M;
}

/**
 * 置いた瞬間にタップを出す。連打の速さもハードルの踏み切りも押した時刻で決まるため。
 * スワイプしてもこのタップは取り消さない（どの入力を使うかは区間ごとにミニゲーム側が決める）
 */
export function touchDown(phase: TouchPhase, point: { x: number; y: number; width: number; atMs: number }): TouchStep {
  if (phase.kind !== "idle") return none(phase);
  return {
    phase: { kind: "pressed", startX: point.x, startY: point.y },
    commands: [
      { type: "tap", atMs: point.atMs },
      { type: "hold", dir: holdDirOfX(point.x, point.width) },
    ],
  };
}

/** 長押しの向きは置いた位置で決まり、動かしても変わない。スワイプは離した時点で判定する */
export function touchMove(phase: TouchPhase): TouchStep {
  return none(phase);
}

export function touchUp(phase: TouchPhase, point: { x: number; y: number }): TouchStep {
  if (phase.kind !== "pressed") return none(IDLE);
  const swipe = classifySwipe(point.x - phase.startX, point.y - phase.startY);
  const commands: InputCommand[] = swipe ? [{ type: "swipe", dir: swipe }] : [];
  return { phase: IDLE, commands: [...commands, { type: "hold", dir: 0 }] };
}

/** 画面外へ出た・システムに奪われた指。離した位置が信用できないのでスワイプは判定しない */
export function touchCancel(phase: TouchPhase): TouchStep {
  if (phase.kind !== "pressed") return none(IDLE);
  return { phase: IDLE, commands: [{ type: "hold", dir: 0 }] };
}
