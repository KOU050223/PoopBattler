import type { Game } from "../types";
import type { Vec3 } from "../three/camera";
import { TOP } from "../three/constants";
import type { FxPlan, SpeedLines } from "../three/fx";
import { restingPosition } from "../three/pose";
import { slowmoScale, type SlowmoState } from "../three/slowmo";
import type { ScreenFxTrigger } from "./screen-fx";
import type { MatchView } from "./session";

/** 3D の落下演出とスプラッシュを見せるために、2D より長く待つ。試作は 1300ms */
const RESULT_DELAY_3D_MS = 1300;
const RESULT_DELAY_2D_MS = 1000;

export const resultDelayMs = (view: MatchView): number => (view === "3d" ? RESULT_DELAY_3D_MS : RESULT_DELAY_2D_MS);

/** FxPlan を各出力へ振り分けた結果。実際の呼び出しは FightView が行う */
export interface FxDispatch {
  /** SumoStage3D.applyFxPlan に渡す。null なら呼ばない */
  stagePlan: FxPlan | null;
  /** ParticleLayer.spawn に渡す */
  shouldSpawnParticles: boolean;
  /** ScreenFx の trigger（id は呼び出し側で加算する）。null なら発火しない */
  screenFx: Omit<ScreenFxTrigger, "id"> | null;
  slowmoMs: number;
  hitStopMs: number;
}

const NO_DISPATCH: FxDispatch = { stagePlan: null, shouldSpawnParticles: false, screenFx: null, slowmoMs: 0, hitStopMs: 0 };

const hasAnyParticle = (plan: FxPlan): boolean => plan.bursts.length + plan.rings.length + plan.dusts.length > 0 || plan.lightFlash !== null;
const hasScreenFxContent = (hasFlash: boolean, speedLines: SpeedLines): boolean => hasFlash || speedLines !== "none";

/**
 * 2D 表示は従来どおり何も出さない。動きを減らす設定のときは、スローモー・揺れ・FOV キック・ScreenFx を止める
 * （回り込み・粒子・ヒットストップは残す）
 */
export function dispatchFxPlan(plan: FxPlan, options: { view: MatchView; isMotionReduced: boolean }): FxDispatch {
  if (options.view === "2d") return NO_DISPATCH;
  const { isMotionReduced } = options;
  const stagePlan: FxPlan = isMotionReduced ? { ...plan, shake: 0, fovKick: 0, slowmoMs: 0 } : plan;
  const hasStageEffect = stagePlan.yawDelta !== 0 || stagePlan.shake > 0 || stagePlan.fovKick > 0;
  return {
    stagePlan: hasStageEffect ? stagePlan : null,
    shouldSpawnParticles: hasAnyParticle(plan),
    screenFx: !isMotionReduced && hasScreenFxContent(plan.hasScreenFlash, plan.speedLines) ? { hasFlash: plan.hasScreenFlash, speedLines: plan.speedLines } : null,
    slowmoMs: isMotionReduced ? 0 : plan.slowmoMs,
    hitStopMs: plan.hitStopMs,
  };
}

/** ロジックへ渡す追加の時間倍率。動きを減らす設定ではスローモーにしない（モード自体の timeScale は stepper が掛ける） */
export function logicExtraScale(slowmo: SlowmoState, nowMs: number, options: { view: MatchView; isMotionReduced: boolean }): number {
  return options.view === "3d" && !options.isMotionReduced ? slowmoScale(slowmo, nowMs) : 1;
}

/** ヒットストップは長い方を採る（重なったとき短い方で上書きして縮めない） */
export const mergedFreezeMs = (currentMs: number, hitStopMs: number): number => Math.max(currentMs, hitStopMs);

/** 熱状態の力士の足元。ParticleLayer が毎フレーム読む配列を使い回すため out に詰める */
export function collectHotPositions(game: Game, out: Vec3[], yaw = 0): Vec3[] {
  out.length = 0;
  for (const fighter of game.f) {
    if (fighter.hot > 0) out.push({ ...restingPosition(game.pos, fighter.side, yaw), y: TOP });
  }
  return out;
}
