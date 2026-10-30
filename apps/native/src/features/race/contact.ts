import { COLLISION, RUNNER_RADIUS } from "./config";
import { chooseLine } from "./overtake";
import type { Rng } from "./rng";
import type { CoursePoint, RaceEvent, Runner } from "./types";

type BumpEvent = Extract<RaceEvent, { type: "bump" }>;

const isAirborne = (runner: Runner, time: number) => time < runner.jumpUntil;

/** 追突を跳ね返すと、追いついた速い側だけが減速して二度と上がれない。後ろの子を横へいなして追い抜きへ回す */
function sidestep(
  rear: Runner,
  front: Runner,
  runners: readonly Runner[],
  points: readonly CoursePoint[],
  rng: Rng,
): void {
  const side = Math.sign(rear.lat - front.lat) || (rng() < 0.5 ? -1 : 1);
  rear.vx += -Math.sin(rear.h) * side * COLLISION.rearEndSideSpeed;
  rear.vz += Math.cos(rear.h) * side * COLLISION.rearEndSideSpeed;
  rear.passingIndex = front.index;
  rear.passLat = chooseLine(rear, front, runners, points);
}

/** 4章 走者同士の当たり判定。衝撃が bumpImpulse を超えたものを bump として返す */
export function resolveContacts(
  runners: readonly Runner[],
  points: readonly CoursePoint[],
  time: number,
  rng: Rng,
): BumpEvent[] {
  const bumps: BumpEvent[] = [];
  const minDistance = RUNNER_RADIUS * 2;
  for (let i = 0; i < runners.length; i++) {
    for (let j = i + 1; j < runners.length; j++) {
      const a = runners[i];
      const b = runners[j];
      if (isAirborne(a, time) || isAirborne(b, time)) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= minDistance || distance === 0) continue;

      const nx = dx / distance;
      const nz = dz / distance;
      const overlap = minDistance - distance;
      const totalMass = a.physics.mass + b.physics.mass;
      a.x -= (nx * overlap * b.physics.mass) / totalMass;
      a.z -= (nz * overlap * b.physics.mass) / totalMass;
      b.x += (nx * overlap * a.physics.mass) / totalMass;
      b.z += (nz * overlap * a.physics.mass) / totalMass;

      const approach = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      if (approach >= 0) continue;

      const aBehind = nx * Math.cos(a.h) + nz * Math.sin(a.h) > COLLISION.rearEndDot;
      const bBehind = -(nx * Math.cos(b.h) + nz * Math.sin(b.h)) > COLLISION.rearEndDot;
      const rear = aBehind ? a : bBehind ? b : null;
      const restitution = rear ? COLLISION.rearEndRestitution : COLLISION.restitution;
      const impulse = (-(1 + restitution) * approach) / (1 / a.physics.mass + 1 / b.physics.mass);
      a.vx -= (nx * impulse) / a.physics.mass;
      a.vz -= (nz * impulse) / a.physics.mass;
      b.vx += (nx * impulse) / b.physics.mass;
      b.vz += (nz * impulse) / b.physics.mass;

      if (rear) {
        sidestep(rear, rear === a ? b : a, runners, points, rng);
        continue;
      }
      // 軽いほうほど向きを大きく崩す
      a.h += ((rng() * 2 - 1) * impulse * COLLISION.turnDisturbance) / a.physics.mass;
      b.h += ((rng() * 2 - 1) * impulse * COLLISION.turnDisturbance) / b.physics.mass;
      if (impulse > COLLISION.bumpImpulse) {
        bumps.push({
          type: "bump",
          runners: [a.index, b.index],
          impulse,
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          z: (a.z + b.z) / 2,
        });
      }
    }
  }
  return bumps;
}

/** 壁の外へ出た分を押し戻し、壁へ向かう速度を反転して減衰させる */
export function resolveWalls(runners: readonly Runner[], points: readonly CoursePoint[]): void {
  for (const runner of runners) {
    const point = points[runner.trackIndex];
    const limit = point.w / 2 - RUNNER_RADIUS * COLLISION.wallRadiusRatio;
    if (Math.abs(runner.lat) <= limit) continue;
    const side = Math.sign(runner.lat);
    const nx = -Math.sin(point.h) * side;
    const nz = Math.cos(point.h) * side;
    const over = Math.abs(runner.lat) - limit;
    runner.x -= nx * over;
    runner.z -= nz * over;
    const towardWall = runner.vx * nx + runner.vz * nz;
    if (towardWall <= 0) continue;
    runner.vx = (runner.vx - nx * towardWall * COLLISION.wallBounce) * COLLISION.wallDamping;
    runner.vz = (runner.vz - nz * towardWall * COLLISION.wallBounce) * COLLISION.wallDamping;
  }
}
