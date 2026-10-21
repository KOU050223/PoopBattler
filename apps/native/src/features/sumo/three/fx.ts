import type { Game, Side, SumoEvent } from "../types";
import type { Vec3 } from "./camera";
import { TOILET_X, TOP } from "./constants";
import { restingPosition } from "./pose";

export type ParticleShape = "spark" | "shard" | "drop";

/** 全方向へ飛ぶ粒子。個々の向き・速さ・寿命のばらつきは seed から描画側が決める */
export interface BurstSpec {
  position: Vec3;
  count: number;
  color: number;
  speed: number;
  lifeMs: number;
  gravity: number;
  spin: number;
  drag: number;
  /** 上向きの底上げ */
  lift: number;
  shape: ParticleShape;
  isAdditive: boolean;
  opacity: number;
  seed: number;
  delayMs: number;
}

export interface RingSpec {
  position: Vec3;
  color: number;
  lifeMs: number;
  /** 1秒あたりの拡大量 */
  growth: number;
  scale: number;
  opacity: number;
  /** true なら床に寝かせる。false ならカメラへ向ける */
  isFlat: boolean;
  delayMs: number;
}

export interface DustSpec {
  position: Vec3;
  count: number;
  /** 水平方向の広がり */
  spread: number;
  color: number;
  seed: number;
  delayMs: number;
}

export interface LightFlashSpec {
  position: Vec3;
  intensity: number;
}

export type SpeedLines = "none" | "parry" | "hit";

export interface FxPlan {
  bursts: BurstSpec[];
  rings: RingSpec[];
  dusts: DustSpec[];
  /** 画面揺れの強さ。複数イベントが重なったら大きい方を採る */
  shake: number;
  fovKick: number;
  slowmoMs: number;
  /** yawTarget への加算量。±YAW_LIMIT への丸めは camera.addYaw が行う */
  yawDelta: number;
  lightFlash: LightFlashSpec | null;
  hasScreenFlash: boolean;
  speedLines: SpeedLines;
  hitStopMs: number;
}

export interface FxContext {
  /** 取組の軸の回り込み。省略は 0 */
  yaw?: number;
  /** 描画側が持つ実際の力士位置。省略時は前進・横ずれなしの立ち位置から求める */
  positions?: readonly [Vec3, Vec3];
}

const DUST_COLOR = 0xc9a274;
const SPLASH_DELAY_MS = 650;
const TSUKI_YAW = 0.42;
const PARRY_YAW = 0.35;

export const emptyFxPlan = (): FxPlan => ({
  bursts: [],
  rings: [],
  dusts: [],
  shake: 0,
  fovKick: 0,
  slowmoMs: 0,
  yawDelta: 0,
  lightFlash: null,
  hasScreenFlash: false,
  speedLines: "none",
  hitStopMs: 0,
});

type BurstOptions = Partial<Omit<BurstSpec, "position" | "count" | "color" | "speed" | "seed">>;

function burst(position: Vec3, count: number, color: number, speed: number, seed: number, options: BurstOptions = {}): BurstSpec {
  return {
    position,
    count,
    color,
    speed,
    lifeMs: 420,
    gravity: 9,
    spin: 14,
    drag: 1.4,
    lift: 0,
    shape: "spark",
    isAdditive: true,
    opacity: 1,
    delayMs: 0,
    ...options,
    seed,
  };
}

function ring(position: Vec3, color: number, lifeMs: number, growth: number, options: Partial<Pick<RingSpec, "scale" | "opacity" | "isFlat" | "delayMs">> = {}): RingSpec {
  return { position, color, lifeMs, growth, scale: 0.3, opacity: 1, isFlat: false, delayMs: 0, ...options };
}

const dust = (position: Vec3, count: number, spread: number, seed: number): DustSpec => ({ position, count, spread, color: DUST_COLOR, seed, delayMs: 0 });

const at = (position: Vec3, y: number): Vec3 => ({ ...position, y });

/** 乱数を seed に変換する。seed の使い方は描画側（粒子ごとのばらつき）が決める */
const nextSeed = (rand: () => number): number => Math.floor(rand() * 0x7fffffff);

/**
 * イベント1件の演出計画。描画を知らず、位置・数・色だけを返す。
 * ポップ文字と触覚は ui/pop.ts と ui/labels.ts の担当なのでここでは扱わない
 */
export function planFx(event: SumoEvent, game: Game, rand: () => number, context: FxContext = {}): FxPlan {
  const yaw = context.yaw ?? 0;
  const positions = context.positions ?? [restingPosition(game.pos, 0, yaw), restingPosition(game.pos, 1, yaw)];
  const contact: Vec3 = at({ x: (positions[0].x + positions[1].x) / 2, y: 0, z: (positions[0].z + positions[1].z) / 2 }, TOP + 0.95);
  const feet = (side: Side): Vec3 => at(positions[side], TOP + 0.1);
  const plan = emptyFxPlan();

  switch (event.type) {
    case "hit": {
      const attacker = game.f[event.attacker];
      const isTsuki = event.hitType === "tsuki";
      const isHeavy = !isTsuki || attacker.ripHit || attacker.special;
      plan.hitStopMs = isTsuki ? 60 : 90;
      plan.shake = isTsuki ? 0.18 : 0.3;
      plan.bursts.push(burst(contact, isHeavy ? 24 : 14, attacker.ripHit ? 0x9fffc8 : 0xffd25e, isHeavy ? 7 : 5, nextSeed(rand)));
      plan.rings.push(ring(contact, attacker.ripHit ? 0xc8ffe0 : 0xffe7a0, 280, isHeavy ? 10 : 6));
      plan.dusts.push(dust(feet(event.defender), isHeavy ? 10 : 5, 2.4, nextSeed(rand)));
      if (isHeavy) plan.speedLines = "hit";
      // 左右の突きは、押した側がその方向へ回り込む
      if (isTsuki && (attacker.dir7 === 0 || attacker.dir7 === 6)) {
        plan.yawDelta = (attacker.side === 0 ? 1 : -1) * (attacker.dir7 === 0 ? 1 : -1) * TSUKI_YAW;
      }
      return plan;
    }
    case "parry": {
      // いなし。土俵際(うっちゃり)だけ弾いたときと同じ大きな演出にする
      const defender = game.f[event.defender];
      plan.hitStopMs = 90;
      plan.shake = event.isEdge ? 0.4 : 0.14;
      if (event.isEdge) addParryBurst(plan, contact, true, rand);
      plan.rings.push(ring(contact, 0x79c8ff, 420, 9));
      plan.bursts.push(burst(contact, 16, 0x9fd8ff, 6, nextSeed(rand)));
      plan.dusts.push(dust(feet(event.attacker), 8, 3, nextSeed(rand)));
      // 受け流した方向へ回り込む
      if (defender.idir !== 3) plan.yawDelta = (defender.side === 0 ? -1 : 1) * (defender.idir === 0 ? 1 : -1) * PARRY_YAW;
      return plan;
    }
    case "block":
      plan.shake = event.isEdge ? 0.35 : 0.22;
      addParryBurst(plan, contact, event.isEdge, rand);
      return plan;
    case "clinchWin": {
      if (event.winner === null || event.loser === null) return plan;
      plan.hitStopMs = 110;
      plan.shake = 0.34;
      plan.bursts.push(burst(contact, 28, 0xff6a4d, 8, nextSeed(rand)));
      plan.rings.push(ring(contact, 0xff8a6a, 420, 12));
      plan.dusts.push(dust(feet(event.loser), 14, 3.5, nextSeed(rand)));
      plan.speedLines = "hit";
      return plan;
    }
    case "clinch":
      if (!event.isStart) return plan;
      plan.rings.push(ring(contact, 0xff6a4d, 400, 8));
      plan.dusts.push(dust(at(contact, TOP + 0.1), 12, 3, nextSeed(rand)));
      return plan;
    case "hot": {
      const origin = at(positions[event.side], TOP + 0.8);
      plan.rings.push(ring(origin, 0xff7a1a, 700, 10));
      plan.bursts.push(burst(origin, 30, 0xffa040, 7, nextSeed(rand), { lifeMs: 700, gravity: -2 }));
      return plan;
    }
    case "end": {
      const loserSide: Side = event.winner === 0 ? 1 : 0;
      const splash = { x: loserSide === 0 ? -TOILET_X : TOILET_X, y: 1.0, z: 0 };
      plan.bursts.push(
        burst(splash, 40, 0x7cc0e0, 5, nextSeed(rand), { shape: "drop", lifeMs: 900, gravity: 11, lift: 3, isAdditive: false, spin: 0, drag: 0.4, delayMs: SPLASH_DELAY_MS }),
      );
      plan.rings.push(ring(splash, 0xbfe6ff, 600, 5, { scale: 0.5, isFlat: true, delayMs: SPLASH_DELAY_MS }));
      return plan;
    }
    case "lunge":
      plan.dusts.push(dust(feet(event.side), 4, 1.6, nextSeed(rand)));
      return plan;
    case "text": {
      if (event.text === "special") {
        const origin = at(positions[event.side], TOP + 0.9);
        plan.rings.push(ring(origin, 0xbf96f0, 600, 7));
        plan.bursts.push(burst(origin, 18, 0xbf96f0, 4, nextSeed(rand), { lifeMs: 500 }));
      } else if (event.text === "aiuchi") {
        plan.bursts.push(burst(contact, 10, 0xffffff, 4, nextSeed(rand)));
      }
      return plan;
    }
    default:
      return plan;
  }
}

/** パリィが弾いた瞬間の大きな閃光。isBig は土俵際(うっちゃり) */
function addParryBurst(plan: FxPlan, contact: Vec3, isBig: boolean, rand: () => number): void {
  plan.rings.push(ring(contact, 0xffffff, 520, 15, { scale: 0.2 }));
  plan.rings.push(ring(contact, 0x8fe6a6, 760, 9, { scale: 0.2, opacity: 0.9 }));
  plan.bursts.push(burst(contact, 30, 0xe8fff4, 9, nextSeed(rand), { shape: "shard", lifeMs: 950, gravity: 6, spin: 18, isAdditive: false, opacity: 0.95, drag: 0.9 }));
  plan.bursts.push(burst(contact, 26, 0x9fffc8, 7, nextSeed(rand), { lifeMs: 520 }));
  if (isBig) plan.bursts.push(burst(contact, 20, 0xffd25e, 10, nextSeed(rand), { lifeMs: 700 }));
  plan.lightFlash = { position: contact, intensity: isBig ? 9 : 6 };
  plan.hasScreenFlash = true;
  plan.speedLines = "parry";
  plan.fovKick = isBig ? 11 : 8;
  plan.slowmoMs = isBig ? 950 : 720;
}
