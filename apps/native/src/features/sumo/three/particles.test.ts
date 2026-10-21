import { describe, expect, it } from "vitest";
import { emptyFxPlan } from "./fx";
import { TOP } from "./constants";
import { addParticles, decayLightIntensity, flameParticles, lifeRemaining, MAX_PARTICLES, particlesFromPlan, seededRand, stepParticles, type Particle } from "./particles";

const plan = () => {
  const result = emptyFxPlan();
  result.bursts.push({ position: { x: 0, y: 2, z: 0 }, count: 5, color: 1, speed: 4, lifeMs: 500, gravity: 9, spin: 3, drag: 1, lift: 0, shape: "spark", isAdditive: true, opacity: 1, seed: 7, delayMs: 0 });
  return result;
};

const still = (overrides: Partial<Particle> = {}): Particle => ({
  ...particlesFromPlan(plan())[0],
  velocity: { x: 0, y: 0, z: 0 },
  position: { x: 0, y: 3, z: 0 },
  drag: 0,
  gravity: 0,
  lifeMs: 500,
  ...overrides,
});

describe("particlesFromPlan", () => {
  it("バーストの count と同じ数の粒子になる", () => {
    expect(particlesFromPlan(plan())).toHaveLength(5);
  });

  it("同じ seed なら同じ粒子になる", () => {
    expect(particlesFromPlan(plan())).toEqual(particlesFromPlan(plan()));
  });

  it("origin が位置へ加算される", () => {
    expect(particlesFromPlan(plan(), { x: 1, y: 0, z: 0 })[0].position.x).toBe(1);
  });
});

describe("stepParticles", () => {
  it("寿命が尽きた粒子は取り除かれる", () => {
    expect(stepParticles([still()], 500)).toHaveLength(0);
  });

  it("寿命内の粒子は残る", () => {
    expect(stepParticles([still()], 100)).toHaveLength(1);
  });

  it("重力で縦速度が下向きに増える", () => {
    const [next] = stepParticles([still({ gravity: 10 })], 100);
    expect(next.velocity.y).toBeCloseTo(-1);
  });

  it("抗力で速度が減る", () => {
    const [next] = stepParticles([still({ drag: 2, velocity: { x: 10, y: 0, z: 0 } })], 100);
    expect(next.velocity.x).toBeLessThan(10);
  });

  it("土俵面を割った粒子は面に戻り上向きに跳ね返る", () => {
    const [next] = stepParticles([still({ position: { x: 0, y: TOP + 0.01, z: 0 }, velocity: { x: 0, y: -10, z: 0 } })], 50);
    expect(next.position.y).toBe(TOP);
    expect(next.velocity.y).toBeGreaterThan(0);
  });

  it("土煙は床で跳ね返らない", () => {
    const [next] = stepParticles([still({ kind: "dust", position: { x: 0, y: TOP + 0.01, z: 0 }, velocity: { x: 0, y: -10, z: 0 } })], 50);
    expect(next.position.y).toBeLessThan(TOP);
  });

  it("待機中の粒子は動かず lifeRemaining が 0", () => {
    const [next] = stepParticles([still({ delayMs: 200, velocity: { x: 5, y: 0, z: 0 } })], 100);
    expect([next.position.x, next.delayMs, lifeRemaining(next)]).toEqual([0, 100, 0]);
  });

  it("待機が明けた分の残り時間だけ動く", () => {
    const [next] = stepParticles([still({ delayMs: 100, velocity: { x: 10, y: 0, z: 0 } })], 200);
    expect(next.position.x).toBeCloseTo(1);
  });

  it("growth で scale が増える", () => {
    const [grown] = stepParticles([still({ scale: 1, growth: 2, lifeMs: 2000 })], 500);
    expect(grown.scale).toBeCloseTo(2);
  });

  it("縮む粒子の scale は 0 未満にならない", () => {
    const [shrunk] = stepParticles([still({ scale: 0.1, growth: -5, lifeMs: 2000 })], 400);
    expect(shrunk.scale).toBe(0);
  });
});

describe("addParticles", () => {
  const many = (count: number, marker: number) => Array.from({ length: count }, () => still({ opacity: marker }));

  it("上限以内ならそのまま足される", () => {
    expect(addParticles(many(3, 1), many(2, 2), 10)).toHaveLength(5);
  });

  it("上限を超えたら古いものから捨てる", () => {
    const result = addParticles(many(8, 1), many(5, 2), 10);
    expect([result.length, result.filter((particle) => particle.opacity === 1).length]).toEqual([10, 5]);
  });

  it("一度に上限より多く来ても上限で切る", () => {
    expect(addParticles([], many(MAX_PARTICLES + 50, 2))).toHaveLength(MAX_PARTICLES);
  });
});

describe("flameParticles", () => {
  it("注入した乱数で決まり、上向きに進む", () => {
    const flames = flameParticles({ x: 0, y: TOP, z: 0 }, 4, seededRand(1));
    expect(flames.every((flame) => flame.kind === "flame" && flame.velocity.y > 0)).toBe(true);
  });
});

describe("decayLightIntensity", () => {
  it("時間とともに減る", () => {
    expect(decayLightIntensity(6, 100)).toBeLessThan(6);
  });

  it("十分小さくなったら 0", () => {
    expect(decayLightIntensity(6, 2000)).toBe(0);
  });
});
