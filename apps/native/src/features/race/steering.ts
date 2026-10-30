import { BRIDGE, COURSE, PHYSICS } from "./config";
import type { CoursePoint } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** 先読みする点の数。速いほど遠くを見る */
export function lookaheadSteps(speed: number): number {
  return clamp(
    Math.round(PHYSICS.lookaheadBase + speed * PHYSICS.lookaheadPerSpeed),
    PHYSICS.lookaheadMin,
    PHYSICS.lookaheadMax,
  );
}

/** 道幅が狭い所では、レーンを幅に比例して縮める */
export function scaledLane(laneBase: number, width: number): number {
  return laneBase * (width / COURSE.roadWidth);
}

export interface SteerInput {
  points: readonly CoursePoint[];
  trackIndex: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  laneBase: number;
  /** 追い抜き中の狙う横位置。なければ null */
  passLat: number | null;
  /** つり橋で針に合わせるときの針の位置。なければ null */
  bridgeNeedle: number | null;
  turn: number;
  dt: number;
}

/** 3.3 先読みした点に自分のレーンを足した所へ向く。曲がる速さは turn で頭打ち */
export function steerHeading(input: SteerInput): number {
  const { points } = input;
  const target = points[Math.min(points.length - 1, input.trackIndex + lookaheadSteps(input.speed))];
  const normalX = -Math.sin(target.h);
  const normalZ = Math.cos(target.h);
  const maxLat = Math.max(0, target.w / 2 - PHYSICS.roadEdgeMargin);

  let lane = input.passLat ?? scaledLane(input.laneBase, target.w);
  if (input.bridgeNeedle !== null) lane = input.bridgeNeedle * (target.w / 2 - BRIDGE.edgeMargin);
  const lat = clamp(lane, -maxLat - PHYSICS.laneSlack, maxLat + PHYSICS.laneSlack);

  const desired = Math.atan2(target.z + normalZ * lat - input.z, target.x + normalX * lat - input.x);
  const maxTurn = input.turn * input.dt;
  return input.heading + clamp(wrapAngle(desired - input.heading), -maxTurn, maxTurn);
}
