import { describe, expect, it } from "vitest";

import {
  canAdvanceFromStaging,
  companionshipRevealCopy,
  isCameraFallback,
  isLiveCameraOverlay,
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
