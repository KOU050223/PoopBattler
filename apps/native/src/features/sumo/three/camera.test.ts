import { describe, expect, it } from "vitest";
import { addYaw, baseFov, cameraTarget, decayFovKick, stepCamera, stepCamYaw, stepYaw } from "./camera";
import { TOILET_X, YAW_LIMIT } from "./constants";

const east = { x: -1, y: 1, z: 0 };
const west = { x: 1, y: 1, z: 0 };

describe("addYaw", () => {
  it("上限を超える加算は +1.3 に丸める", () => {
    expect(addYaw(1.2, 0.42)).toBe(YAW_LIMIT);
  });

  it("下限を超える加算は -1.3 に丸める", () => {
    expect(addYaw(-1.2, -0.42)).toBe(-YAW_LIMIT);
  });

  it("範囲内ならそのまま足す", () => {
    expect(addYaw(0.2, 0.42)).toBeCloseTo(0.62);
  });
});

describe("yaw の追従", () => {
  it("camYaw は yaw より遅れて追う", () => {
    const yaw = stepYaw(0, 1, 16);
    const camYaw = stepCamYaw(0, 1, 16);
    expect(camYaw).toBeLessThan(yaw);
    expect(camYaw).toBeGreaterThan(0);
  });
});

describe("baseFov", () => {
  it("縦長(aspect<0.8)は広く、横長は狭い", () => {
    expect(baseFov(0.5)).toBe(62);
    expect(baseFov(1.8)).toBe(50);
  });

  it("aspect が 0.8 ちょうどは横長扱い", () => {
    expect(baseFov(0.8)).toBe(50);
  });
});

describe("cameraTarget", () => {
  const base = { camYaw: 0, eastPosition: east, westPosition: west, winner: null } as const;

  it("縦長は横長より東から遠く、高い", () => {
    const portrait = cameraTarget({ ...base, aspect: 0.5 });
    const landscape = cameraTarget({ ...base, aspect: 1.8 });
    expect(Math.abs(portrait.position.x - east.x)).toBeGreaterThan(Math.abs(landscape.position.x - east.x));
    expect(portrait.position.y).toBeGreaterThan(landscape.position.y);
  });

  it("取組中の注視点は二人の中間の高さ 1.15", () => {
    const rig = cameraTarget({ ...base, aspect: 1 });
    expect(rig.lookAt.y).toBe(1.15);
    expect(rig.lookAt.x).toBeCloseTo(0.6);
  });

  it("東が勝つと西(+x)の便器側を見る", () => {
    expect(cameraTarget({ ...base, aspect: 1, winner: 0 }).lookAt.x).toBeCloseTo(TOILET_X * 0.6);
  });

  it("西が勝つと東(-x)の便器側を見る", () => {
    expect(cameraTarget({ ...base, aspect: 1, winner: 1 }).lookAt.x).toBeCloseTo(-TOILET_X * 0.6);
  });
});

describe("stepCamera", () => {
  const rig = cameraTarget({ aspect: 1, camYaw: 0, eastPosition: east, westPosition: west, winner: null });
  const far = { position: { x: 0, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } };

  it("isSnap なら目標へ即座に合わせる", () => {
    expect(stepCamera(far, rig, 16, true)).toEqual(rig);
  });

  it("通常は目標へ少しだけ近づく", () => {
    const next = stepCamera(far, rig, 16);
    expect(Math.abs(next.position.x)).toBeGreaterThan(0);
    expect(Math.abs(next.position.x)).toBeLessThan(Math.abs(rig.position.x));
  });
});

describe("decayFovKick", () => {
  it("0 未満にならない", () => {
    expect(decayFovKick(1, 1000)).toBe(0);
  });
});
