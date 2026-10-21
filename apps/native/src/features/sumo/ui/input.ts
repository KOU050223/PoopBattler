// タッチ入力 → 手（act）への変換。画面にもロジックにも依存しない純関数だけを置く。
// 仕様: docs/battle.md 2.2 / 4.1（長押し判定は使わない）

/** スワイプとみなす移動量(px) */
export const SWIPE_THRESHOLD_PX = 34;

/** ロジックの方向値。0=画面の右 / 6=画面の左（3=上は使わない） */
export const DIR_RIGHT = 0;
export const DIR_LEFT = 6;
export type SideDir = typeof DIR_RIGHT | typeof DIR_LEFT;

export type SwipeKind = "tsuki" | "grab";

/** 左右の判定。ちょうど中央は左扱い（「真上は左」） */
export function sideDirOfX(x: number, width: number): SideDir {
  return x > width / 2 ? DIR_RIGHT : DIR_LEFT;
}

/**
 * 上へ34px以上で突き、下へ34px以上で四つ。縦の移動量だけで決める
 * （横にだけ動かした指は、守りのまま何もしない）
 */
export function classifySwipe(dy: number): SwipeKind | null {
  if (dy <= -SWIPE_THRESHOLD_PX) return "tsuki";
  if (dy >= SWIPE_THRESHOLD_PX) return "grab";
  return null;
}

/** 入力が起こす手。engine の act / clinchTap にそのまま渡せる形 */
export type InputCommand =
  | { type: "guard"; dir: SideDir }
  | { type: "guardEnd" }
  | { type: "tsuki"; dir: SideDir }
  | { type: "grab" }
  | { type: "grabRelease" }
  | { type: "clinchTap" };

export type TouchPhase =
  | { kind: "idle" }
  /** 指を置いて守っている。スワイプで攻めへ切り替わる */
  | { kind: "guarding"; startY: number; dir: SideDir }
  /** 四つを溜めている。離すと出る */
  | { kind: "charging" }
  /** 突きを出した。指を離すまで追加の入力は受けない */
  | { kind: "attacked" }
  /** がっぷり中に置いた指。離すまで何もしない */
  | { kind: "clinching" };

export interface TouchStep {
  phase: TouchPhase;
  commands: InputCommand[];
}

export const IDLE: TouchPhase = { kind: "idle" };

const none = (phase: TouchPhase): TouchStep => ({ phase, commands: [] });

export function touchDown(phase: TouchPhase, point: { x: number; y: number; width: number; isClinch: boolean }): TouchStep {
  if (phase.kind !== "idle") return none(phase);
  if (point.isClinch) return { phase: { kind: "clinching" }, commands: [{ type: "clinchTap" }] };
  const dir = sideDirOfX(point.x, point.width);
  return {
    phase: { kind: "guarding", startY: point.y, dir },
    commands: [{ type: "guard", dir }],
  };
}

export function touchMove(phase: TouchPhase, point: { x: number; y: number }): TouchStep {
  if (phase.kind !== "guarding") return none(phase);
  const swipe = classifySwipe(point.y - phase.startY);
  if (swipe === "tsuki") return { phase: { kind: "attacked" }, commands: [{ type: "tsuki", dir: phase.dir }] };
  if (swipe === "grab") return { phase: { kind: "charging" }, commands: [{ type: "grab" }] };
  return none(phase);
}

export function touchUp(phase: TouchPhase): TouchStep {
  switch (phase.kind) {
    case "guarding":
      return { phase: IDLE, commands: [{ type: "guardEnd" }] };
    case "charging":
      return { phase: IDLE, commands: [{ type: "grabRelease" }] };
    default:
      return none(IDLE);
  }
}
