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

    // 決着カメラの画角・姿勢から、ワールド点が画面(-1〜1)に入るかを調べる
    const isInFrame = (rig: ReturnType<typeof cameraTarget>, aspect: number, point: { x: number; y: number; z: number }): boolean => {
      const sub = (a: typeof point, b: typeof point) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
      const dot = (a: typeof point, b: typeof point) => a.x * b.x + a.y * b.y + a.z * b.z;
      const cross = (a: typeof point, b: typeof point) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
      const unit = (a: typeof point) => {
        const length = Math.hypot(a.x, a.y, a.z);
        return { x: a.x / length, y: a.y / length, z: a.z / length };
      };
      const forward = unit(sub(rig.lookAt, rig.position));
      const right = unit(cross(forward, { x: 0, y: 1, z: 0 }));
      const up = cross(right, forward);
      const offset = sub(point, rig.position);
      const depth = dot(offset, forward);
      const halfFovTan = Math.tan((baseFov(aspect) * Math.PI) / 360);
      return depth > 0 && Math.abs(dot(offset, right) / depth) <= halfFovTan * aspect && Math.abs(dot(offset, up) / depth) <= halfFovTan;
    };

    it.each(aspects)("aspect %s: 取組中より高い位置から見下ろす", (aspect) => {
      expect(ended(aspect, 0).position.y).toBeGreaterThan(duringFight(aspect).position.y);
    });

    it.each(aspects)("aspect %s: 俯角は 60〜80 度", (aspect) => {
      const { position, lookAt } = ended(aspect, 0);
      const elevationDeg = (Math.atan2(position.y - lookAt.y, Math.hypot(position.x - lookAt.x, position.z - lookAt.z)) * 180) / Math.PI;
      expect(elevationDeg).toBeGreaterThanOrEqual(60);
      expect(elevationDeg).toBeLessThanOrEqual(80);
    });

    it("東が勝つと西(+x)の便器側へ寄る", () => {
      expect(ended(1, 0).lookAt.x).toBeGreaterThan(0);
    });

    it("西が勝つと東(-x)の便器側へ寄り、位置と注視点が左右反転する", () => {
      const eastWins = ended(1, 0);
      const westWins = ended(1, 1);
      expect(westWins.lookAt.x).toBeCloseTo(-eastWins.lookAt.x);
      expect(westWins.position.x).toBeCloseTo(-eastWins.position.x);
    });

    it.each(aspects)("aspect %s: 落下開始位置・落下の頂点・便器・勝者が画面に入る(東勝ち)", (aspect) => {
      const rig = ended(aspect, 0);
      const points = [
        { x: 3.8, y: 1.05, z: 0.8 }, // 敗者の落下開始(土俵の端)
        { x: 6.2, y: 2.25, z: 0 }, // 放物線の頂点付近
        { x: TOILET_X, y: 0.1, z: 0 }, // 便器
        { x: TOILET_X + 1, y: 0.1, z: 0 }, // 便器の外縁
        { x: 1.5, y: 1.05, z: 0 }, // 勝者
      ];
      expect(points.map((point) => isInFrame(rig, aspect, point))).toEqual(points.map(() => true));
    });

    it.each(aspects)("aspect %s: 西勝ちでも東側の便器が画面に入る", (aspect) => {
      const rig = ended(aspect, 1);
      expect(isInFrame(rig, aspect, { x: -TOILET_X, y: 0.1, z: 0 })).toBe(true);
      expect(isInFrame(rig, aspect, { x: -3.8, y: 1.05, z: 0.8 })).toBe(true);
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
