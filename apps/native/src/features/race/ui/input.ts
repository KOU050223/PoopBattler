// タッチ入力 → レースへのコマンドの変換。画面にもロジックにも依存しない純関数だけを置く。
// gesture-handler でも素のタッチイベントでも、down / move / up を渡せばつながる。
// 仕様: docs/race.md 5章 / 7章の4・5。タップ・長押しは試作の bindInput と同じタイミングで出す。スワイプは試作と違い、動かして条件を満たした瞬間に出す

/**
 * スワイプとみなす最低の移動量(dp)。試作は 28 CSS px だったが、実機（Pixel 9a）では指がずれただけで通ってしまった。
 * Android の最小タッチ領域 48dp に合わせ、これ未満の動きは「触れただけ」とみなす
 */
export const SWIPE_MIN_DISTANCE_DP = 48;

/** 画面幅に対するスワイプの必要移動量の割合。幅の広い端末ほど指の自然なぶれも大きいため、最低値と比べて大きい方を使う */
export const SWIPE_WIDTH_RATIO = 0.12;

/** 大きい軸が小さい軸のこの倍に満たない斜めの動きは、向きが定まらないので無視する（約34度以内なら通る） */
export const SWIPE_AXIS_DOMINANCE = 1.5;

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
  /** isSwipeSent: この押下で swipe を出し済みか。1回の押下で出す swipe は1回だけにする */
  | { kind: "pressed"; startX: number; startY: number; isSwipeSent: boolean };

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

export function swipeThresholdPx(width: number): number {
  return Math.max(SWIPE_MIN_DISTANCE_DP, width * SWIPE_WIDTH_RATIO);
}

/**
 * 移動量の大きい軸で向きを決める。その軸の移動量が「超えた」とき（ちょうどは含まない）だけスワイプ。
 * しきい値に届かない・斜めすぎる場合は null（=スワイプなし）
 */
export function classifySwipe(dx: number, dy: number, width: number): SwipeDir | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const major = Math.max(absX, absY);
  const minor = Math.min(absX, absY);
  if (major <= swipeThresholdPx(width)) return null;
  if (major < minor * SWIPE_AXIS_DOMINANCE) return null;
  if (absX > absY) return dx > 0 ? "right" : "left";
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
    phase: { kind: "pressed", startX: point.x, startY: point.y, isSwipeSent: false },
    commands: [
      { type: "tap", atMs: point.atMs },
      { type: "hold", dir: holdDirOfX(point.x, point.width) },
    ],
  };
}

/**
 * 長押しの向きは置いた位置で決まり、動かしても変わない。
 * スワイプは条件を初めて満たした瞬間に出す。離すのを待つと、押してから離すまでの間に矢印が時間切れで進み、次の矢印を巻き込むため
 */
export function touchMove(phase: TouchPhase, point: { x: number; y: number; width: number }): TouchStep {
  if (phase.kind !== "pressed" || phase.isSwipeSent) return none(phase);
  const swipe = classifySwipe(point.x - phase.startX, point.y - phase.startY, point.width);
  if (!swipe) return none(phase);
  return { phase: { ...phase, isSwipeSent: true }, commands: [{ type: "swipe", dir: swipe }] };
}

/** 移動イベントを取りこぼして、まだスワイプを出していないときの保険 */
export function touchUp(phase: TouchPhase, point: { x: number; y: number; width: number }): TouchStep {
  if (phase.kind !== "pressed") return none(IDLE);
  const swipe = phase.isSwipeSent ? null : classifySwipe(point.x - phase.startX, point.y - phase.startY, point.width);
  const commands: InputCommand[] = swipe ? [{ type: "swipe", dir: swipe }] : [];
  return { phase: IDLE, commands: [...commands, { type: "hold", dir: 0 }] };
}

/** 画面外へ出た・システムに奪われた指。離した位置が信用できないのでスワイプは判定しない */
export function touchCancel(phase: TouchPhase): TouchStep {
  if (phase.kind !== "pressed") return none(IDLE);
  return { phase: IDLE, commands: [{ type: "hold", dir: 0 }] };
}
