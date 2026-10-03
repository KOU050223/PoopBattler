import { describe, expect, it } from "vitest";

import {
  canAdvanceFromStaging,
  canStartGachaBySwipe,
  clientPointFromPercent,
  companionshipPhaseDelay,
  companionshipRevealCopy,
  COMPANIONSHIP_PHASE_MS,
  gachaRevealScale,
  GACHA_AR_SCALE_MAX,
  GACHA_AR_SCALE_MIN,
  GACHA_AR_SCALE_REF_FRACTION,
  GACHA_SWIPE_MIN_DISTANCE_PX,
  isCameraFallback,
  isLiveCameraOverlay,
  isThrowSwipe,
  nextCompanionshipArPhase,
  resolveRevealTarget,
  REVEAL_FAIL_COPY,
  REVEAL_SUCCESS_COPY,
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
  sizeFraction: 0.5,
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
          sizeFraction: 0.1,
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

describe("gachaRevealScale", () => {
  it("hit は bbox 高さ比でスケールし、範囲外はクランプ。非 hit は 1", () => {
    const scaledSight = { ...hitSight, sizeFraction: GACHA_AR_SCALE_REF_FRACTION };
    expect(gachaRevealScale(scaledSight)).toBeCloseTo(1);
    expect(
      gachaRevealScale({ ...hitSight, sizeFraction: GACHA_AR_SCALE_REF_FRACTION * 0.1 }),
    ).toBeCloseTo(GACHA_AR_SCALE_MIN);
    expect(
      gachaRevealScale({ ...hitSight, sizeFraction: GACHA_AR_SCALE_REF_FRACTION * 4 }),
    ).toBeCloseTo(GACHA_AR_SCALE_MAX);
    expect(gachaRevealScale({ kind: "none" })).toBe(1);
    expect(gachaRevealScale({ ...hitSight, sizeFraction: 0 })).toBe(1);
    expect(
      gachaRevealScale({
        kind: "low",
        box: hitSight.box,
        target: hitSight.target,
        sizeFraction: 0.4,
      }),
    ).toBe(1);
  });
});

describe("resolveRevealTarget", () => {
  it("hit 中は検出座標へ追従し、見失ったら fallback に留まる", () => {
    const fallback = { x: 33, y: 66 };
    expect(resolveRevealTarget({ sight: hitSight, fallback })).toEqual(hitSight.target);
    expect(resolveRevealTarget({ sight: { kind: "none" }, fallback })).toEqual(fallback);
    expect(
      resolveRevealTarget({
        sight: {
          kind: "low",
          box: hitSight.box,
          target: { x: 1, y: 2 },
          sizeFraction: 0.4,
        },
        fallback,
      }),
    ).toEqual(fallback);
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
  it("投げ入れのあと揺れ、reduced-motion は揺れを飛ばす", () => {
    expect(nextCompanionshipArPhase("staging", true)).toBe("throw");
    expect(nextCompanionshipArPhase("staging", false)).toBe("shake");
    expect(nextCompanionshipArPhase("throw", true)).toBe("shake");
    expect(nextCompanionshipArPhase("shake", true)).toBe("reveal");
    expect(nextCompanionshipArPhase("reveal", true)).toBe("summary");
    expect(nextCompanionshipArPhase("staging", false, true)).toBe("reveal");
    expect(nextCompanionshipArPhase("throw", true, true)).toBe("reveal");
    expect(nextCompanionshipArPhase("shake", true, true)).toBe("reveal");
  });
});

describe("companionshipPhaseDelay", () => {
  it("staging は待たず、揺れは 700ms、reduced-motion は 0", () => {
    expect(companionshipPhaseDelay("staging", false)).toBeNull();
    expect(companionshipPhaseDelay("summary", false)).toBeNull();
    expect(companionshipPhaseDelay("throw", false)).toBe(COMPANIONSHIP_PHASE_MS.throw);
    expect(companionshipPhaseDelay("shake", false)).toBe(COMPANIONSHIP_PHASE_MS.shake);
    expect(companionshipPhaseDelay("reveal", false)).toBe(COMPANIONSHIP_PHASE_MS.reveal);
    expect(companionshipPhaseDelay("shake", true)).toBe(0);
    expect(companionshipPhaseDelay("throw", true)).toBe(0);
    // reduced-motion でも抽選結果だけは静止表示で確認できる時間を残す
    expect(companionshipPhaseDelay("reveal", true)).toBe(COMPANIONSHIP_PHASE_MS.revealReduced);
  });
});

describe("companionshipRevealCopy", () => {
  it("成功と失敗の文字を取り違えない", () => {
    expect(companionshipRevealCopy({ acquired: true, usedMealLog: true })).toBe(REVEAL_SUCCESS_COPY);
    expect(companionshipRevealCopy({ acquired: false, usedMealLog: true })).toBe(REVEAL_FAIL_COPY);
    expect(companionshipRevealCopy({ acquired: false, usedMealLog: true })).not.toBe(
      REVEAL_SUCCESS_COPY,
    );
  });
});
