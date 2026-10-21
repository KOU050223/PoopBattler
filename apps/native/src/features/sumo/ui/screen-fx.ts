// 画面全体の演出（白フラッシュ・集中線）の再生パラメータ。試作の #flash / #lines の CSS を数値に起こしたもの。
import type { SpeedLines } from "../three/fx";

export interface ScreenFxTrigger {
  /** 変わるたびに一発再生する */
  id: number;
  hasFlash: boolean;
  speedLines: SpeedLines;
}

export interface FlashSpec {
  durationMs: number;
  peakOpacity: number;
}

export interface LinesSpec {
  durationMs: number;
  startOpacity: number;
  startScale: number;
  /** 終了時の回転(度)。パリィの余韻だけ少し回す */
  endRotationDeg: number;
  /** rgba の色。アルファは含めず、強さは rayOpacity で決める */
  rayColor: string;
  rayOpacity: number;
  rayCount: number;
  rayWidth: number;
  /** 中心の抜け。画面の長辺に対する比率 */
  innerRadiusRatio: number;
}

export interface ScreenFxPlan {
  flash: FlashSpec | null;
  lines: LinesSpec | null;
}

export const SCREEN_FX_CENTER_Y_RATIO = 0.45;

const FLASH: FlashSpec = { durationMs: 500, peakOpacity: 1 };

const PARRY_LINES: LinesSpec = {
  durationMs: 900,
  startOpacity: 0.95,
  startScale: 1.2,
  endRotationDeg: 3,
  rayColor: "255,255,255",
  rayOpacity: 0.6,
  rayCount: 60,
  rayWidth: 2,
  innerRadiusRatio: 0.18,
};

// 強打は短く、少し赤みを入れて「当たった」感を出す。回転させないのは一瞬で消えるため
const HIT_LINES: LinesSpec = {
  durationMs: 350,
  startOpacity: 0.85,
  startScale: 1.12,
  endRotationDeg: 0,
  rayColor: "255,214,200",
  rayOpacity: 0.5,
  rayCount: 48,
  rayWidth: 2,
  innerRadiusRatio: 0.22,
};

export function screenFxPlan(trigger: ScreenFxTrigger | null, isMotionReduced: boolean): ScreenFxPlan {
  if (!trigger || isMotionReduced) return { flash: null, lines: null };
  return {
    flash: trigger.hasFlash ? FLASH : null,
    lines: trigger.speedLines === "parry" ? PARRY_LINES : trigger.speedLines === "hit" ? HIT_LINES : null,
  };
}

/** i 本目の集中線の角度(度)。均等割り */
export function rayAngleDeg(index: number, rayCount: number): number {
  return (360 / rayCount) * index;
}
