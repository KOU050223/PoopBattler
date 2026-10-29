import { describe, expect, it } from "vitest";
import { CAMERA, createCameraDirector, fitFov, type CameraInput, type CameraKind, type CameraRunner, type CameraTrigger } from "./camera";
import { createRng } from "./rng";

const SEED = 20260101;
const DT = 1 / 60;
const FINISH_S = 400;

const runner = (s: number, overrides: Partial<CameraRunner> = {}): CameraRunner => ({ x: s, y: 0, z: 0, h: 0, s, lat: 0, isFinished: false, ...overrides });

function input(overrides: Partial<CameraInput> = {}): CameraInput {
  return {
    isPreStart: false,
    time: 30,
    finishS: FINISH_S,
    leaderS: 100,
    playerFinishedAt: null,
    isHurdleSlow: false,
    isInMiniGame: false,
    distanceToNextZone: 100,
    trigger: null,
    runners: [runner(90), runner(100), runner(80), runner(95)],
    playerIndex: 0,
    pointAt: (s) => ({ x: s, y: 0, z: 0, h: 0 }),
    aspect: 9 / 19.5,
    dashPerf: 0,
    ...overrides,
  };
}

const firstKind = (overrides: Partial<CameraInput>): CameraKind => createCameraDirector(createRng(SEED)).update(input(overrides), DT).kind;

describe("カメラの優先順位", () => {
  it("スタート前はグリッドの周りを回る", () => {
    expect(firstKind({ isPreStart: true })).toBe("start");
  });

  it("先頭がゴールの16m手前に来るとゴール前になる", () => {
    expect(firstKind({ leaderS: FINISH_S - 10 })).toBe("finish");
  });

  it("自分のゴール後2.5秒以内はゴール前のまま", () => {
    expect(firstKind({ leaderS: FINISH_S, playerFinishedAt: 29 })).toBe("finish");
  });

  it("自分のゴール後2.5秒を過ぎると後ろ追いに戻る", () => {
    expect(firstKind({ leaderS: FINISH_S, playerFinishedAt: 20 })).toBe("chase");
  });

  it("ハードルのスロー中は自分の横の低い位置", () => {
    expect(firstKind({ isHurdleSlow: true })).toBe("hurdle");
  });

  it("ハードルのスローはミニゲーム中より優先される", () => {
    expect(firstKind({ isHurdleSlow: true, isInMiniGame: true })).toBe("hurdle");
  });

  it("抜いたきっかけは自分のアップ", () => {
    expect(firstKind({ trigger: "overtake" })).toBe("close");
  });

  it("ぶつかったきっかけは自分の横", () => {
    expect(firstKind({ trigger: "bump" })).toBe("meSide");
  });

  it("カットインのきっかけは自分のアップ", () => {
    expect(firstKind({ trigger: "cutin" })).toBe("close");
  });

  it("強制切り替えはミニゲーム中より優先される", () => {
    expect(firstKind({ trigger: "bump", isInMiniGame: true })).toBe("meSide");
  });

  it("ミニゲーム中は後ろ追いの高い位置", () => {
    expect(firstKind({ isInMiniGame: true })).toBe("minigame");
  });

  it("次の区間の8m手前に入ると後ろ追いに戻す", () => {
    expect(firstKind({ distanceToNextZone: 7.9 })).toBe("minigame");
  });

  it("先頭がゴールの40m手前より先なら自分を正面から撮る", () => {
    expect(firstKind({ leaderS: FINISH_S - 30 })).toBe("finishFront");
  });

  it("上のどれでもなければ抽選で選ぶ", () => {
    expect(["packRear", "packFront", "chase", "meSide", "meFront", "meHigh", "close", "rival"]).toContain(firstKind({}));
  });

  it("強制切り替えが終わると抽選に戻る", () => {
    const director = createCameraDirector(createRng(SEED));
    director.update(input({ trigger: "overtake" }), DT);
    const later = director.update(input(), CAMERA.forcedMaxSec + 0.1);
    expect(later.kind).not.toBe("close");
  });
});

describe("強制切り替えの長さ", () => {
  it("1.3秒より短くは続かない", () => {
    const director = createCameraDirector(createRng(SEED));
    director.update(input({ trigger: "bump" }), DT);
    expect(director.update(input(), CAMERA.forcedMinSec - 0.1).kind).toBe("meSide");
  });
});

describe("カットと補間", () => {
  it("種類が変わったフレームはカット", () => {
    const director = createCameraDirector(createRng(SEED));
    director.update(input({ isInMiniGame: true }), DT);
    expect(director.update(input({ isHurdleSlow: true }), DT).isCut).toBe(true);
  });

  it("同じ種類が続くあいだはカットにならない", () => {
    const director = createCameraDirector(createRng(SEED));
    director.update(input({ isInMiniGame: true }), DT);
    expect(director.update(input({ isInMiniGame: true }), DT).isCut).toBe(false);
  });

  it("カットのときは新しい位置へ補間せず飛ぶ", () => {
    const director = createCameraDirector(createRng(SEED));
    director.update(input({ isInMiniGame: true }), DT);
    const moved = input({ isHurdleSlow: true });
    const expected = createCameraDirector(createRng(SEED)).update(moved, DT).position;
    expect(director.update(moved, DT).position).toEqual(expected);
  });

  it("同じ種類が続くと追いかけを補間して遅れてついてくる", () => {
    const director = createCameraDirector(createRng(SEED));
    const before = director.update(input({ isInMiniGame: true }), DT);
    const after = director.update(input({ isInMiniGame: true, runners: [runner(190), runner(200)] }), DT);
    expect(after.position.x - before.position.x).toBeLessThan(100);
  });

  it("ゴール前のカメラは補間せず固定", () => {
    const director = createCameraDirector(createRng(SEED));
    const a = director.update(input({ leaderS: FINISH_S - 10 }), DT);
    const b = director.update(input({ leaderS: FINISH_S - 5 }), DT);
    expect(b.position).toEqual(a.position);
  });
});

describe("全体とライバルの連続", () => {
  it("全体とライバルは2回続けて出ない", () => {
    const director = createCameraDirector(createRng(SEED));
    const groups: string[] = [];
    let previous: CameraKind | null = null;
    let now = 0;
    for (; now < 600; now += 0.5) {
      const out = director.update(input({ runners: [runner(90), runner(100), runner(80), runner(95)] }), 0.5);
      if (out.kind !== previous) {
        groups.push(out.kind === "packRear" || out.kind === "packFront" ? "pack" : out.kind === "rival" ? "rival" : "me");
        previous = out.kind;
      }
    }
    const repeats = groups.filter((g, i) => i > 0 && g !== "me" && g === groups[i - 1]);
    expect(repeats).toHaveLength(0);
  });
});

describe("映る時間の割合", () => {
  const TOTAL_SEC = 600;
  const FORCED_PERIOD_SEC = 4;

  function shares(triggerEverySec: number | null) {
    const director = createCameraDirector(createRng(SEED));
    const seconds = { pack: 0, me: 0, rival: 0 };
    const steps = Math.round(TOTAL_SEC / DT);
    const stepsPerTrigger = triggerEverySec === null ? Infinity : Math.round(triggerEverySec / DT);
    for (let i = 0; i < steps; i++) {
      const trigger: CameraTrigger = i % stepsPerTrigger === 0 ? "overtake" : null;
      const { kind } = director.update(input({ trigger }), DT);
      if (kind === "packRear" || kind === "packFront") seconds.pack += DT;
      else if (kind === "rival") seconds.rival += DT;
      else seconds.me += DT;
    }
    return { pack: (seconds.pack / TOTAL_SEC) * 100, me: (seconds.me / TOTAL_SEC) * 100, rival: (seconds.rival / TOTAL_SEC) * 100 };
  }

  const TOLERANCE_PT = 5;
  // 強制切り替え（抜いた・ぶつかった・カットイン）が5秒に1回ほど起きる想定
  const withForced = shares(FORCED_PERIOD_SEC + 1);
  const withoutForced = shares(null);

  it("強制を混ぜない抽選では全体が重みどおり26%に近い", () => {
    expect(Math.abs(withoutForced.pack - 26)).toBeLessThan(TOLERANCE_PT);
  });

  it("強制を混ぜない抽選ではプレイヤーが重みどおり58%に近い", () => {
    expect(Math.abs(withoutForced.me - 58)).toBeLessThan(TOLERANCE_PT);
  });

  it("強制を混ぜない抽選ではライバルが重みどおり16%に近い", () => {
    expect(Math.abs(withoutForced.rival - 16)).toBeLessThan(TOLERANCE_PT);
  });

  it("強制を混ぜると全体は17%に近い", () => {
    expect(Math.abs(withForced.pack - 17)).toBeLessThan(TOLERANCE_PT);
  });

  it("強制を混ぜるとプレイヤーは74%に近い", () => {
    expect(Math.abs(withForced.me - 74)).toBeLessThan(TOLERANCE_PT);
  });

  it("強制を混ぜるとライバルは9%に近い", () => {
    expect(Math.abs(withForced.rival - 9)).toBeLessThan(TOLERANCE_PT);
  });
});

describe("ライバルの選び方", () => {
  const rivalRunners = (aheadGap: number) => [runner(100), runner(100 + aheadGap), runner(95), runner(60)];

  function rivalOf(runners: CameraRunner[]): number | null {
    const director = createCameraDirector(createRng(SEED));
    for (let i = 0; i < 6000; i++) {
      const out = director.update(input({ runners }), 0.1);
      if (out.kind === "rival") return out.rivalIndex;
    }
    return null;
  }

  it("25m以内の前の子がいればその子", () => {
    expect(rivalOf(rivalRunners(10))).toBe(1);
  });

  it("前の子が25m以上先ならすぐ後ろの子", () => {
    expect(rivalOf(rivalRunners(40))).toBe(2);
  });

  it("ライバル以外の種類では番号を返さない", () => {
    expect(createCameraDirector(createRng(SEED)).update(input({ isInMiniGame: true }), DT).rivalIndex).toBeNull();
  });
});

describe("全体のカメラの引き", () => {
  const packInput = (spread: number) => input({ runners: [runner(100), runner(100 + spread)], playerIndex: 0 });

  function packPosition(spread: number) {
    const director = createCameraDirector(createRng(SEED));
    for (let i = 0; i < 6000; i++) {
      const out = director.update(packInput(spread), 0.1);
      if (out.kind === "packRear") return out.position;
    }
    throw new Error("packRear が出なかった");
  }

  it("群れが長いほど後方へ引く", () => {
    expect(packPosition(40).x).toBeLessThan(packPosition(0).x);
  });

  it("群れが長いほど高く上がる", () => {
    expect(packPosition(40).y).toBeGreaterThan(packPosition(0).y);
  });
});

describe("fitFov", () => {
  it("横長（4:3.4）では元の値のまま", () => {
    expect(fitFov(50, CAMERA.designAspect)).toBe(50);
  });

  it("縦長（9:19.5）では大きくなる", () => {
    expect(fitFov(50, 9 / 19.5)).toBeGreaterThan(50);
  });

  it("縦長でも80度を超えない", () => {
    expect(fitFov(62, 9 / 19.5)).toBeLessThanOrEqual(80);
  });

  it("極端に細長くても80度で頭打ちになる", () => {
    expect(fitFov(62, 0.2)).toBe(80);
  });
});
