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

  describe("決着カメラ", () => {
    const aspects = [0.46, 0.56, 1.0, 1.8];
    const duringFight = (aspect: number) => cameraTarget({ ...base, aspect });
    const ended = (aspect: number, winner: 0 | 1) => cameraTarget({ ...base, aspect, winner });

    type Point = { x: number; y: number; z: number };
    const subOf = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
    const crossOf = (a: Point, b: Point) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
    const unitOf = (a: Point) => {
      const length = Math.hypot(a.x, a.y, a.z);
      return { x: a.x / length, y: a.y / length, z: a.z / length };
    };

    // 決着カメラの画角・姿勢から、ワールド点が画面(-1〜1)に入るかを調べる
    const isInFrame = (rig: ReturnType<typeof cameraTarget>, aspect: number, point: Point): boolean => {
      const forward = unitOf(subOf(rig.lookAt, rig.position));
      const right = unitOf(crossOf(forward, { x: 0, y: 1, z: 0 }));
      const up = crossOf(right, forward);
      const offset = subOf(point, rig.position);
      const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y + a.z * b.z;
      const depth = dot(offset, forward);
      const halfFovTan = Math.tan((baseFov(aspect) * Math.PI) / 360);
      return depth > 0 && Math.abs(dot(offset, right) / depth) <= halfFovTan * aspect && Math.abs(dot(offset, up) / depth) <= halfFovTan;
    };

    it.each(aspects)("aspect %s: 取組中より高い位置から見下ろす", (aspect) => {
      expect(ended(aspect, 0).position.y).toBeGreaterThan(duringFight(aspect).position.y);
    });

    it.each(aspects)("aspect %s: 俯角は 70〜80 度", (aspect) => {
      const { position, lookAt } = ended(aspect, 0);
      const elevationDeg = (Math.atan2(position.y - lookAt.y, Math.hypot(position.x - lookAt.x, position.z - lookAt.z)) * 180) / Math.PI;
      expect(elevationDeg).toBeGreaterThanOrEqual(70);
      expect(elevationDeg).toBeLessThanOrEqual(80);
    });

    // ワールド点を投影した画面座標(-1〜1)。画面外・背面は null
    const project = (rig: ReturnType<typeof cameraTarget>, aspect: number, point: { x: number; y: number; z: number }) => {
      const forward = unitOf(subOf(rig.lookAt, rig.position));
      const right = unitOf(crossOf(forward, { x: 0, y: 1, z: 0 }));
      const up = crossOf(right, forward);
      const offset = subOf(point, rig.position);
      const depth = offset.x * forward.x + offset.y * forward.y + offset.z * forward.z;
      const halfFovTan = Math.tan((baseFov(aspect) * Math.PI) / 360);
      const dotWith = (axis: typeof point) => offset.x * axis.x + offset.y * axis.y + offset.z * axis.z;
      return { x: dotWith(right) / depth / (halfFovTan * aspect), y: dotWith(up) / depth / halfFovTan };
    };

    it.each([0, 1] as const)("勝者 %s: 注視点は敗者側の便器中心", (winner) => {
      const { lookAt } = ended(1, winner);
      expect(Math.abs(lookAt.x)).toBe(TOILET_X);
      expect(lookAt.z).toBe(0);
    });

    it("東が勝つと西(+x)、西が勝つと東(-x)の便器を映し、左右反転する", () => {
      const eastWins = ended(1, 0);
      const westWins = ended(1, 1);
      expect(eastWins.lookAt.x).toBeGreaterThan(0);
      expect(westWins.lookAt.x).toBeCloseTo(-eastWins.lookAt.x);
      expect(westWins.position.x).toBeCloseTo(-eastWins.position.x);
    });

    it.each(aspects)("aspect %s: 便器の中心が画面中央付近に映る", (aspect) => {
      const rig = ended(aspect, 0);
      const { x, y } = project(rig, aspect, { x: TOILET_X, y: 0.6, z: 0 });
      expect(Math.hypot(x, y)).toBeLessThan(0.05);
    });

    it.each(aspects)("aspect %s: 便器の幅が画面幅の 1/4〜1/2 になる", (aspect) => {
      const rig = ended(aspect, 0);
      const left = project(rig, aspect, { x: TOILET_X - 0.85, y: 0.9, z: 0 });
      const right = project(rig, aspect, { x: TOILET_X + 0.85, y: 0.9, z: 0 });
      const screenShare = Math.abs(right.x - left.x) / 2;
      expect(screenShare).toBeGreaterThanOrEqual(0.25);
      expect(screenShare).toBeLessThanOrEqual(0.5);
    });

    it.each(aspects)("aspect %s: 便器に入る直前〜吸い込み中の落下位置が画面に入る(東勝ち)", (aspect) => {
      const rig = ended(aspect, 0);
      const points = [
        { x: TOILET_X - 1.5, y: 1.4, z: 0.1 }, // 便器の手前
        { x: TOILET_X - 0.5, y: 1.0, z: 0 }, // 便器に入る瞬間
        { x: TOILET_X, y: 0.4, z: 0 }, // 吸い込まれ中
      ];
      expect(points.map((point) => isInFrame(rig, aspect, point))).toEqual(points.map(() => true));
    });

    it.each(aspects)("aspect %s: 西勝ちでも東側の便器が画面に入る", (aspect) => {
      const rig = ended(aspect, 1);
      expect(isInFrame(rig, aspect, { x: -TOILET_X, y: 0.1, z: 0 })).toBe(true);
      expect(isInFrame(rig, aspect, { x: -TOILET_X + 1.5, y: 1.4, z: 0.1 })).toBe(true);
    });
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
