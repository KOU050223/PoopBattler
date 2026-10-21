import type { Vec3 } from "./camera";
import { TOP } from "./constants";
import type { BurstSpec, DustSpec, FxPlan, ParticleShape, RingSpec } from "./fx";

export type ParticleKind = ParticleShape | "dust" | "ring" | "flame";

export interface Particle {
  kind: ParticleKind;
  position: Vec3;
  velocity: Vec3;
  /** z 軸まわりの回転（ビルボード的に使う粒子用）と、各軸の回転 */
  rotation: Vec3;
  spin: Vec3;
  color: number;
  opacity: number;
  isAdditive: boolean;
  /** 0 以下で発生済み。正の間は待機で、動かず描かれない */
  delayMs: number;
  ageMs: number;
  lifeMs: number;
  gravity: number;
  /** 速度の指数減衰率(1/秒) */
  drag: number;
  scale: number;
  /** 1秒あたりの scale 増分 */
  growth: number;
  /** リングだけが使う。true なら床に寝かせる */
  isFlat: boolean;
}

export type Rand = () => number;

/** モバイルGLの描画負荷の上限。超えたら古いものから捨てる */
export const MAX_PARTICLES = 200;
/** 床で跳ね返るときに残す速度の割合 */
export const BOUNCE_RESTITUTION = 0.35;
/** 床で跳ね返った水平速度に掛ける摩擦 */
const BOUNCE_FRICTION = 0.7;
/** これ未満の縦速度は跳ねず止まる。微小な振動を防ぐ */
const BOUNCE_MIN_SPEED = 0.6;
/** 粒子の大きさ（ワールド） */
const SIZE_BY_KIND: Record<ParticleKind, number> = { spark: 0.07, shard: 0.1, drop: 0.07, dust: 0.22, ring: 1, flame: 0.16 };
const DUST_LIFE_MS = 700;
const DUST_GROWTH = 0.7;
const DUST_RISE = 0.6;
const FLAME_LIFE_MS = 520;
const FLAME_COLORS = [0xff5a10, 0xff8a1a, 0xffc23a] as const;
const FLAME_RISE = 1.8;
const FLAME_SPREAD = 0.25;
const FLAME_SHRINK = -0.2;
const LIGHT_DECAY_PER_SEC = 9;
const LIGHT_CUTOFF = 0.02;

/** seed から決定的な乱数を作る(mulberry32)。同じ seed なら同じ飛び方になる */
export function seededRand(seed: number): Rand {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const offset = (position: Vec3, origin: Vec3): Vec3 => ({ x: position.x + origin.x, y: position.y + origin.y, z: position.z + origin.z });
const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
const signed = (rand: Rand): number => rand() * 2 - 1;

function burstParticles(spec: BurstSpec, origin: Vec3): Particle[] {
  const rand = seededRand(spec.seed);
  return Array.from({ length: spec.count }, () => {
    // 球面上に一様に散らす
    const cosPolar = signed(rand);
    const sinPolar = Math.sqrt(1 - cosPolar * cosPolar);
    const azimuth = rand() * Math.PI * 2;
    const speed = spec.speed * (0.4 + rand() * 0.6);
    return {
      kind: spec.shape,
      position: offset(spec.position, origin),
      velocity: { x: sinPolar * Math.cos(azimuth) * speed, y: cosPolar * speed + spec.lift, z: sinPolar * Math.sin(azimuth) * speed },
      rotation: { x: rand() * Math.PI, y: rand() * Math.PI, z: rand() * Math.PI },
      spin: { x: signed(rand) * spec.spin, y: signed(rand) * spec.spin, z: signed(rand) * spec.spin },
      color: spec.color,
      opacity: spec.opacity,
      isAdditive: spec.isAdditive,
      delayMs: spec.delayMs,
      ageMs: 0,
      lifeMs: spec.lifeMs * (0.7 + rand() * 0.3),
      gravity: spec.gravity,
      drag: spec.drag,
      scale: SIZE_BY_KIND[spec.shape] * (0.6 + rand() * 0.8),
      growth: 0,
      isFlat: false,
    };
  });
}

function dustParticles(spec: DustSpec, origin: Vec3): Particle[] {
  const rand = seededRand(spec.seed);
  return Array.from({ length: spec.count }, () => {
    const azimuth = rand() * Math.PI * 2;
    const speed = spec.spread * (0.3 + rand() * 0.7);
    return {
      kind: "dust" as const,
      position: offset(spec.position, origin),
      velocity: { x: Math.cos(azimuth) * speed, y: DUST_RISE * (0.5 + rand()), z: Math.sin(azimuth) * speed },
      rotation: ZERO,
      spin: ZERO,
      color: spec.color,
      opacity: 0.55,
      isAdditive: false,
      delayMs: spec.delayMs,
      ageMs: 0,
      lifeMs: DUST_LIFE_MS * (0.7 + rand() * 0.3),
      gravity: 0,
      drag: 3,
      scale: SIZE_BY_KIND.dust * (0.6 + rand() * 0.6),
      growth: DUST_GROWTH,
      isFlat: false,
    };
  });
}

function ringParticle(spec: RingSpec, origin: Vec3): Particle {
  return {
    kind: "ring",
    position: offset(spec.position, origin),
    velocity: ZERO,
    rotation: ZERO,
    spin: ZERO,
    color: spec.color,
    opacity: spec.opacity,
    isAdditive: true,
    delayMs: spec.delayMs,
    ageMs: 0,
    lifeMs: spec.lifeMs,
    gravity: 0,
    drag: 0,
    scale: spec.scale,
    growth: spec.growth,
    isFlat: spec.isFlat,
  };
}

/** FxPlan を粒子へ展開する。origin は plan の位置へ足す（省略は 0） */
export function particlesFromPlan(plan: FxPlan, origin: Vec3 = ZERO): Particle[] {
  return [
    ...plan.bursts.flatMap((spec) => burstParticles(spec, origin)),
    ...plan.dusts.flatMap((spec) => dustParticles(spec, origin)),
    ...plan.rings.map((spec) => ringParticle(spec, origin)),
  ];
}

/** 熱状態の力士の足元から上る炎を count 個作る */
export function flameParticles(position: Vec3, count: number, rand: Rand): Particle[] {
  return Array.from({ length: count }, () => ({
    kind: "flame" as const,
    position: { x: position.x + signed(rand) * FLAME_SPREAD, y: position.y, z: position.z + signed(rand) * FLAME_SPREAD },
    velocity: { x: signed(rand) * 0.3, y: FLAME_RISE * (0.6 + rand() * 0.6), z: signed(rand) * 0.3 },
    rotation: ZERO,
    spin: ZERO,
    color: FLAME_COLORS[Math.floor(rand() * FLAME_COLORS.length)],
    opacity: 0.9,
    isAdditive: true,
    delayMs: 0,
    ageMs: 0,
    lifeMs: FLAME_LIFE_MS * (0.7 + rand() * 0.3),
    gravity: 0,
    drag: 1,
    scale: SIZE_BY_KIND.flame * (0.7 + rand() * 0.6),
    growth: FLAME_SHRINK,
    isFlat: false,
  }));
}

/** 上限を超えた分は古い粒子（配列の先頭側）から捨てる */
export function addParticles(current: readonly Particle[], incoming: readonly Particle[], maxCount: number = MAX_PARTICLES): Particle[] {
  const merged = [...current, ...incoming];
  return merged.length > maxCount ? merged.slice(merged.length - maxCount) : merged;
}

function stepOne(particle: Particle, dtMs: number, floorY: number): Particle | null {
  let remainingMs = dtMs;
  let delayMs = particle.delayMs;
  if (delayMs > 0) {
    // 待機が終わった分の残り時間だけ動かす
    delayMs -= dtMs;
    if (delayMs > 0) return { ...particle, delayMs };
    remainingMs = -delayMs;
    delayMs = 0;
  }

  const ageMs = particle.ageMs + remainingMs;
  if (ageMs >= particle.lifeMs) return null;

  const dt = remainingMs / 1000;
  const damping = Math.exp(-particle.drag * dt);
  const velocity = {
    x: particle.velocity.x * damping,
    y: (particle.velocity.y - particle.gravity * dt) * damping,
    z: particle.velocity.z * damping,
  };
  const position = { x: particle.position.x + velocity.x * dt, y: particle.position.y + velocity.y * dt, z: particle.position.z + velocity.z * dt };

  // 土俵面での跳ね返り。炎・リング・土煙は床を無視する
  const isBouncy = particle.kind === "spark" || particle.kind === "shard" || particle.kind === "drop";
  if (isBouncy && position.y < floorY && velocity.y < 0) {
    position.y = floorY;
    velocity.y = -velocity.y > BOUNCE_MIN_SPEED ? -velocity.y * BOUNCE_RESTITUTION : 0;
    velocity.x *= BOUNCE_FRICTION;
    velocity.z *= BOUNCE_FRICTION;
  }

  return {
    ...particle,
    position,
    velocity,
    rotation: { x: particle.rotation.x + particle.spin.x * dt, y: particle.rotation.y + particle.spin.y * dt, z: particle.rotation.z + particle.spin.z * dt },
    scale: Math.max(0, particle.scale + particle.growth * dt),
    delayMs,
    ageMs,
  };
}

/** 全粒子を dtMs 進める。寿命切れは取り除く */
export function stepParticles(particles: readonly Particle[], dtMs: number, floorY: number = TOP): Particle[] {
  const next: Particle[] = [];
  for (const particle of particles) {
    const stepped = stepOne(particle, dtMs, floorY);
    if (stepped) next.push(stepped);
  }
  return next;
}

/** 寿命に対する残り割合。待機中は 0（描かない） */
export const lifeRemaining = (particle: Particle): number => (particle.delayMs > 0 ? 0 : Math.max(0, 1 - particle.ageMs / particle.lifeMs));

/** ライトフラッシュの強度を指数減衰させる。十分小さくなったら 0 */
export function decayLightIntensity(intensity: number, dtMs: number): number {
  const decayed = intensity * Math.exp((-LIGHT_DECAY_PER_SEC * dtMs) / 1000);
  return decayed < LIGHT_CUTOFF ? 0 : decayed;
}
