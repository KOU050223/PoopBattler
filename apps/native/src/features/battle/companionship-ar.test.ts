import { describe, expect, it } from "vitest";

import { GACHA_SWIPE_MIN_DISTANCE_PX } from "@poopbattler/domain/battle/companionship-ar";

import {
  gachaCameraStatus,
  gravityAxisFromDeviceMotion,
  resolveStageTouch,
  type StageRect,
} from "./companionship-ar";

const STAGE: StageRect = { left: 0, top: 0, width: 300, height: 400 };
const CENTER = { x: 50, y: 50 };

describe("gachaCameraStatus", () => {
  it("カメラエラーは権限・デバイスより優先して error", () => {
    expect(
      gachaCameraStatus({ permission: "granted", hasDevice: true, cameraFailed: true }),
    ).toBe("error");
  });

  it("拒否は denied（フォールバック経路）", () => {
    expect(
      gachaCameraStatus({ permission: "denied", hasDevice: true, cameraFailed: false }),
    ).toBe("denied");
  });

  it("未要求は starting（要求中の待ち状態）", () => {
    expect(
      gachaCameraStatus({ permission: "undetermined", hasDevice: true, cameraFailed: false }),
    ).toBe("starting");
  });

  it("許可済みでも背面カメラが無ければ unavailable（シミュレータ等）", () => {
    expect(
      gachaCameraStatus({ permission: "granted", hasDevice: false, cameraFailed: false }),
    ).toBe("unavailable");
  });

  it("許可済み+デバイスありで ready", () => {
    expect(
      gachaCameraStatus({ permission: "granted", hasDevice: true, cameraFailed: false }),
    ).toBe("ready");
  });
});

describe("resolveStageTouch", () => {
  const base = {
    stage: STAGE,
    canSwipe: true,
    throwTarget: CENTER,
    sightIsHit: true,
  };

  it("throw/shake 中は触っても無視する", () => {
    for (const phase of ["throw", "shake", "summary"] as const) {
      expect(
        resolveStageTouch({ ...base, phase, start: { x: 150, y: 300 }, end: { x: 150, y: 200 } }),
      ).toEqual({ type: "ignore" });
    }
  });

  it("reveal のタップは confirm", () => {
    expect(
      resolveStageTouch({ ...base, phase: "reveal", start: { x: 10, y: 10 }, end: { x: 14, y: 12 } }),
    ).toEqual({ type: "confirm" });
  });

  it("reveal のスワイプは誤操作として無視", () => {
    expect(
      resolveStageTouch({ ...base, phase: "reveal", start: { x: 150, y: 300 }, end: { x: 150, y: 100 } }),
    ).toEqual({ type: "ignore" });
  });

  it("staging のタップは便器 hit 中でなければ aim（%座標に変換される）", () => {
    const decision = resolveStageTouch({
      ...base,
      phase: "staging",
      sightIsHit: false,
      start: { x: 150, y: 200 },
      end: { x: 153, y: 202 },
    });
    expect(decision).toEqual({ type: "aim", point: { x: 51, y: 50.5 } });
  });

  it("staging のタップは便器 hit 中なら無視（狙いを上書きしない）", () => {
    expect(
      resolveStageTouch({
        ...base,
        phase: "staging",
        start: { x: 150, y: 200 },
        end: { x: 152, y: 201 },
      }),
    ).toEqual({ type: "ignore" });
  });

  it("staging で投げ入れ先へ向かうスワイプは throw", () => {
    const decision = resolveStageTouch({
      ...base,
      phase: "staging",
      start: { x: 150, y: 380 },
      end: { x: 150, y: 220 },
    });
    expect(decision).toEqual({ type: "throw" });
  });

  it("便器と逆方向へのスワイプは無視", () => {
    const decision = resolveStageTouch({
      ...base,
      phase: "staging",
      start: { x: 150, y: 300 },
      end: { x: 150, y: 380 },
    });
    expect(decision).toEqual({ type: "ignore" });
  });

  it("canSwipe=false ならスワイプしても無視", () => {
    expect(
      resolveStageTouch({
        ...base,
        phase: "staging",
        canSwipe: false,
        start: { x: 150, y: 380 },
        end: { x: 150, y: 220 },
      }),
    ).toEqual({ type: "ignore" });
  });

  it("スワイプ判定の距離閾値は domain の GACHA_SWIPE_MIN_DISTANCE_PX に一致する", () => {
    // 閾値ちょうどより短い移動はタップ扱い（aim か ignore）になる
    const short = resolveStageTouch({
      ...base,
      phase: "staging",
      sightIsHit: false,
      start: { x: 150, y: 200 },
      end: { x: 150, y: 200 - (GACHA_SWIPE_MIN_DISTANCE_PX - 1) },
    });
    expect(short.type).not.toBe("throw");
  });
});

describe("gravityAxisFromDeviceMotion", () => {
  it("expo-sensors の値は web と逆符号（地球向き）なので反転して渡す", () => {
    // web devicemotion は反力（上向き）、expo-sensors は重力ベクトル（地球向き）。
    // domain は上向きを期待するので全成分を反転する。
    expect(gravityAxisFromDeviceMotion({ x: -0.3, y: -6.1, z: -9.81 })).toEqual({ x: 0.3, y: 6.1, z: 9.81 });
  });

  it("欠損は null のまま返す", () => {
    expect(gravityAxisFromDeviceMotion(null)).toBeNull();
    expect(gravityAxisFromDeviceMotion(undefined)).toBeNull();
  });
});
