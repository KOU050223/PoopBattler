import { describe, expect, it } from "vitest";

import {
  DEFAULT_THROW_TARGET,
  mapCoverBBox,
  overlayBoxFromDetection,
  percentPointFromClient,
  pickToiletDetection,
  resolveThrowTarget,
  seatBiasedTarget,
  stagingAdvanceDelayMs,
  toiletDebugCopy,
  toiletSightFromDetection,
  TOILET_ACCEPT_SCORE,
  TOILET_DEBUG_SCORE,
  TOILET_SEAT_BIAS,
  TOILET_STAGING_WAIT_MS,
} from "./toilet-detection";

const toiletHit = {
  bbox: [10, 20, 100, 200] as [number, number, number, number],
  class: "toilet",
  score: 0.82,
};

const toiletLow = {
  bbox: [10, 20, 100, 200] as [number, number, number, number],
  class: "toilet",
  score: 0.31,
};

describe("pickToiletDetection", () => {
  it("toilet だけを見て、score が最も高い枠を取る", () => {
    const picked = pickToiletDetection([
      { bbox: [0, 0, 10, 10], class: "person", score: 0.99 },
      { bbox: [1, 1, 10, 10], class: "toilet", score: 0.61 },
      { bbox: [2, 2, 10, 10], class: "toilet", score: 0.88 },
      { bbox: [3, 3, 10, 10], class: "sink", score: 0.95 },
    ]);
    expect(picked?.score).toBe(0.88);
    expect(picked?.class).toBe("toilet");
  });

  it("toilet が無い・debug 未満は検出しない", () => {
    expect(pickToiletDetection([{ bbox: [0, 0, 10, 10], class: "person", score: 0.99 }])).toBeNull();
    expect(
      pickToiletDetection([
        { bbox: [0, 0, 10, 10], class: "toilet", score: TOILET_DEBUG_SCORE - 0.01 },
      ]),
    ).toBeNull();
    expect(pickToiletDetection([])).toBeNull();
  });
});

describe("toiletSightFromDetection", () => {
  it("採用・低score・なしを取り違えない", () => {
    const box = { x: 1, y: 2, width: 3, height: 4, score: toiletHit.score };
    const hit = toiletSightFromDetection(toiletHit, box, 100, 100);
    const low = toiletSightFromDetection(toiletLow, { ...box, score: toiletLow.score }, 100, 100);
    expect(hit.kind).toBe("hit");
    expect(low.kind).toBe("low");
    expect(toiletSightFromDetection(null, box, 100, 100)).toEqual({ kind: "none" });
    expect(toiletSightFromDetection(toiletHit, null, 100, 100)).toEqual({ kind: "none" });
    expect(toiletLow.score).toBeLessThan(TOILET_ACCEPT_SCORE);
    if (hit.kind === "hit") expect(hit.box).toEqual(box);
    if (low.kind === "low") expect(low.box.score).toBe(toiletLow.score);
  });
});

describe("mapCoverBBox", () => {
  it("横長映像を正方形に cover すると左右が切れ、映像中央は表示中央になる", () => {
    const mapped = mapCoverBBox([100, 50, 40, 20], 200, 100, 100, 100);
    expect(mapped).toEqual({
      x: 50,
      y: 50,
      width: 40,
      height: 20,
      score: 0,
    });
  });

  it("切られた左端の映像座標は表示の x=0 に来る", () => {
    expect(mapCoverBBox([50, 0, 40, 20], 200, 100, 100, 100)).toEqual({
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      score: 0,
    });
  });

  it("映像サイズが 0 なら写さない", () => {
    expect(mapCoverBBox([0, 0, 10, 10], 0, 100, 100, 100)).toBeNull();
    expect(mapCoverBBox([0, 0, 10, 10], 100, 100, 0, 100)).toBeNull();
  });
});

describe("overlayBoxFromDetection", () => {
  it("score を表示用の枠へ残す", () => {
    const box = overlayBoxFromDetection(toiletHit, 200, 400, 200, 400);
    expect(box?.score).toBe(0.82);
    expect(box?.x).toBe(10);
    expect(box?.width).toBe(100);
  });
});

describe("resolveThrowTarget", () => {
  it("hit なら座面寄り。低score や未検出はタップ、それも無ければ既定位置", () => {
    const hitBox = { x: 20, y: 40, width: 80, height: 100, score: 0.9 };
    const target = seatBiasedTarget(hitBox, 200, 400);
    const tap = { x: 12, y: 18 };
    expect(
      resolveThrowTarget({
        sight: { kind: "hit", box: hitBox, target },
        tap,
      }),
    ).toEqual(target);
    expect(
      resolveThrowTarget({
        sight: { kind: "low", box: hitBox, target },
        tap,
      }),
    ).toEqual(tap);
    expect(
      resolveThrowTarget({
        sight: { kind: "none" },
        tap: null,
      }),
    ).toEqual(DEFAULT_THROW_TARGET);
  });

  it("座面は bbox 中心ではなく下寄り", () => {
    const box = { x: 0, y: 0, width: 100, height: 100, score: 1 };
    const target = seatBiasedTarget(box, 100, 100);
    expect(target.x).toBe(50);
    expect(target.y).toBe(TOILET_SEAT_BIAS * 100);
  });
});

describe("percentPointFromClient", () => {
  it("枠内のタップを 0-100% にする。幅 0 は捨てる", () => {
    expect(percentPointFromClient(150, 120, { left: 100, top: 100, width: 200, height: 100 })).toEqual({
      x: 25,
      y: 20,
    });
    expect(percentPointFromClient(0, 0, { left: 0, top: 0, width: 0, height: 10 })).toBeNull();
  });
});

describe("toiletDebugCopy", () => {
  it("検出あり・低score・なし・読込・失敗が別文言", () => {
    const hit = toiletDebugCopy("ready", {
      kind: "hit",
      box: { x: 0, y: 0, width: 1, height: 1, score: 0.74 },
      target: DEFAULT_THROW_TARGET,
    });
    const low = toiletDebugCopy("ready", {
      kind: "low",
      box: { x: 0, y: 0, width: 1, height: 1, score: 0.31 },
      target: DEFAULT_THROW_TARGET,
    });
    const none = toiletDebugCopy("ready", { kind: "none" });
    expect(hit).toContain("便器を検出");
    expect(hit).toContain("74%");
    expect(low).toContain("便器かも");
    expect(low).toContain("31%");
    expect(none).toContain("見つかりません");
    expect(toiletDebugCopy("loading", { kind: "none" })).toBe("便器を探しています");
    expect(toiletDebugCopy("failed", { kind: "none" })).toContain("自動検出が使えません");
    expect(hit).not.toBe(low);
    expect(low).not.toBe(none);
  });
});

describe("stagingAdvanceDelayMs", () => {
  it("カメラ未準備では進めない。フォールバックは待たず、読込中だけ上限待ち", () => {
    expect(
      stagingAdvanceDelayMs({
        cameraReady: false,
        cameraFallback: false,
        modelStatus: "loading",
        reduceMotion: false,
      }),
    ).toBeNull();
    expect(
      stagingAdvanceDelayMs({
        cameraReady: false,
        cameraFallback: true,
        modelStatus: "idle",
        reduceMotion: false,
      }),
    ).toBe(700);
    expect(
      stagingAdvanceDelayMs({
        cameraReady: true,
        cameraFallback: false,
        modelStatus: "loading",
        reduceMotion: false,
      }),
    ).toBe(TOILET_STAGING_WAIT_MS);
    expect(
      stagingAdvanceDelayMs({
        cameraReady: true,
        cameraFallback: false,
        modelStatus: "ready",
        reduceMotion: false,
      }),
    ).toBe(700);
  });
});
