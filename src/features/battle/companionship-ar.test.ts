import { describe, expect, it } from "vitest";

import {
  canAdvanceFromStaging,
  canStartGachaBySwipe,
  clientPointFromPercent,
  companionshipRevealCopy,
  GACHA_SWIPE_MIN_DISTANCE_PX,
  isCameraFallback,
  isLiveCameraOverlay,
  isThrowSwipe,
  nextCompanionshipArPhase,
  shouldCrawlOut,
  shouldPlayThrow,
  usesCompanionshipAr,
} from "./companionship-ar";

describe("usesCompanionshipAr", () => {
  it("食事ログを使った回だけカメラ重畳する", () => {
    expect(usesCompanionshipAr({ usedMealLog: true })).toBe(true);
    expect(usesCompanionshipAr({ usedMealLog: false })).toBe(false);
  });
});

describe("shouldPlayThrow / shouldCrawlOut", () => {
  it("写真があるときだけ投げ入れ、取得時だけ這い出る", () => {
    expect(shouldPlayThrow("photo-1")).toBe(true);
    expect(shouldPlayThrow(null)).toBe(false);
    expect(shouldCrawlOut({ id: "curry-poop" })).toBe(true);
    expect(shouldCrawlOut(null)).toBe(false);
  });
});

describe("camera overlay vs fallback", () => {
  it("ready はライブ、拒否はフォールバックで抽選結果は変えない", () => {
    expect(isLiveCameraOverlay("ready")).toBe(true);
    expect(isLiveCameraOverlay("denied")).toBe(false);
    expect(isCameraFallback("denied")).toBe(true);
    expect(isCameraFallback("ready")).toBe(false);
    expect(canAdvanceFromStaging("starting")).toBe(false);
    expect(canAdvanceFromStaging("ready")).toBe(true);
    expect(canAdvanceFromStaging("denied")).toBe(true);
  });
});

const hitSight = {
  kind: "hit" as const,
  box: { x: 10, y: 20, width: 80, height: 100, score: 0.74 },
  target: { x: 50, y: 72 },
};

describe("canStartGachaBySwipe", () => {
  it("hit のあとはスワイプ可。見える前と未タップの未検出は不可", () => {
    expect(
      canStartGachaBySwipe({
        phase: "staging",
        cameraStatus: "ready",
        modelStatus: "ready",
        sight: hitSight,
        hasAimPoint: false,
      }),
    ).toBe(true);
    expect(
      canStartGachaBySwipe({
        phase: "staging",
        cameraStatus: "ready",
        modelStatus: "loading",
        sight: { kind: "none" },
        hasAimPoint: false,
      }),
    ).toBe(false);
    expect(
      canStartGachaBySwipe({
        phase: "staging",
        cameraStatus: "ready",
        modelStatus: "ready",
        sight: { kind: "none" },
        hasAimPoint: false,
      }),
    ).toBe(false);
    expect(
      canStartGachaBySwipe({
        phase: "staging",
        cameraStatus: "starting",
        modelStatus: "idle",
        sight: { kind: "none" },
        hasAimPoint: true,
      }),
    ).toBe(false);
    expect(
      canStartGachaBySwipe({
        phase: "throw",
        cameraStatus: "ready",
        modelStatus: "ready",
        sight: hitSight,
        hasAimPoint: false,
      }),
    ).toBe(false);
  });

  it("検出不能や低scoreは、タップで投げ入れ先を決めたあとだけスワイプ可", () => {
    expect(
      canStartGachaBySwipe({
        phase: "staging",
        cameraStatus: "denied",
        modelStatus: "failed",
        sight: { kind: "none" },
        hasAimPoint: false,
      }),
    ).toBe(false);
    expect(
      canStartGachaBySwipe({
        phase: "staging",
        cameraStatus: "denied",
        modelStatus: "failed",
        sight: { kind: "none" },
        hasAimPoint: true,
      }),
    ).toBe(true);
    expect(
      canStartGachaBySwipe({
        phase: "staging",
        cameraStatus: "ready",
        modelStatus: "ready",
        sight: {
          kind: "low",
          box: { x: 8, y: 8, width: 40, height: 40, score: 0.31 },
          target: { x: 20, y: 30 },
        },
        hasAimPoint: false,
      }),
    ).toBe(false);
    expect(
      canStartGachaBySwipe({
        phase: "staging",
        cameraStatus: "ready",
        modelStatus: "ready",
        sight: { kind: "none" },
        hasAimPoint: true,
      }),
    ).toBe(true);
  });
});

describe("isThrowSwipe", () => {
  const start = { x: 100, y: 40 };
  const target = { x: 100, y: 200 };

  it("便器方向の十分なスワイプは開始。短い動きと逆方向は開始しない", () => {
    expect(isThrowSwipe(start, { x: 104, y: 40 + GACHA_SWIPE_MIN_DISTANCE_PX }, target)).toBe(true);
    expect(isThrowSwipe(start, { x: 100, y: 40 + (GACHA_SWIPE_MIN_DISTANCE_PX - 1) }, target)).toBe(false);
    expect(isThrowSwipe(start, { x: 100, y: 40 - GACHA_SWIPE_MIN_DISTANCE_PX }, target)).toBe(false);
    expect(clientPointFromPercent({ x: 50, y: 72 }, { left: 10, top: 20, width: 200, height: 100 })).toEqual({
      x: 110,
      y: 92,
    });
  });
});

describe("nextCompanionshipArPhase", () => {
  it("写真がなければ投げ入れを飛ばす", () => {
    expect(nextCompanionshipArPhase("staging", true)).toBe("throw");
    expect(nextCompanionshipArPhase("staging", false)).toBe("reveal");
    expect(nextCompanionshipArPhase("throw", true)).toBe("reveal");
    expect(nextCompanionshipArPhase("reveal", true)).toBe("summary");
  });
});

describe("companionshipRevealCopy", () => {
  it("成功と失敗で再抽選できない旨を取り違えない", () => {
    expect(companionshipRevealCopy({ acquired: true, usedMealLog: true })).toBe(
      "便器から這い出てきた",
    );
    expect(companionshipRevealCopy({ acquired: false, usedMealLog: true })).toContain(
      "再抽選はできません",
    );
    expect(companionshipRevealCopy({ acquired: false, usedMealLog: true })).not.toBe(
      "便器から這い出てきた",
    );
  });
});
