/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  pickToiletDetection,
  overlayBoxFromDetection,
} from "@poopbattler/domain/battle/toilet-detection";

import {
  cocoDetectionFromRaw,
  cocoDetectionsFromRaw,
  uprightFrameSize,
  uprightRotationForOrientation,
  SSD_LABELS,
  type RawSsdDetection,
} from "./ssd-detections";

describe("uprightRotationForOrientation", () => {
  it("iOS 背面カメラの landscape-left は 90deg で正立になる", () => {
    expect(uprightRotationForOrientation("landscape-left")).toBe("90deg");
    expect(uprightRotationForOrientation("landscape-right")).toBe("270deg");
    expect(uprightRotationForOrientation("portrait-upside-down")).toBe("180deg");
    expect(uprightRotationForOrientation("portrait")).toBe("0deg");
  });
});

describe("uprightFrameSize", () => {
  it("landscape 系は縦横を入れ替える", () => {
    expect(uprightFrameSize(1920, 1080, "landscape-left")).toEqual({ width: 1080, height: 1920 });
    expect(uprightFrameSize(1920, 1080, "landscape-right")).toEqual({ width: 1080, height: 1920 });
  });

  it("portrait 系はそのまま", () => {
    expect(uprightFrameSize(1080, 1920, "portrait")).toEqual({ width: 1080, height: 1920 });
    expect(uprightFrameSize(1080, 1920, "portrait-upside-down")).toEqual({ width: 1080, height: 1920 });
  });
});

describe("cocoDetectionFromRaw", () => {
  const toiletRaw: RawSsdDetection = {
    box: [0.25, 0.5, 0.75, 0.9],
    classIndex: 70,
    score: 0.8,
  };

  it("正規化 box をフレーム画素座標の [x,y,w,h] に変換しラベルを解決する", () => {
    const detection = cocoDetectionFromRaw(toiletRaw, 1080, 1920);
    expect(detection).not.toBeNull();
    expect(detection?.class).toBe("toilet");
    expect(detection?.score).toBe(0.8);
    expect(detection?.bbox).toEqual([0.5 * 1080, 0.25 * 1920, (0.9 - 0.5) * 1080, (0.75 - 0.25) * 1920]);
  });

  it("範囲外の box は [0,1] にクリップされる", () => {
    const detection = cocoDetectionFromRaw(
      { box: [-0.2, 0.4, 1.3, 0.6], classIndex: 70, score: 0.6 },
      1000,
      1000,
    );
    expect(detection?.bbox).toEqual([400, 0, 200, 1000]);
  });

  it("toilet 以外のラベルはそのまま class 名になる", () => {
    const person = cocoDetectionFromRaw({ box: [0, 0, 0.5, 0.5], classIndex: 1, score: 0.9 }, 100, 100);
    expect(person?.class).toBe("person");
  });

  it("labelmap のギャップや範囲外 index、退化 box は null を返す", () => {
    expect(cocoDetectionFromRaw({ box: [0, 0, 0.5, 0.5], classIndex: 0, score: 0.9 }, 100, 100)?.class).toBe("???");
    expect(cocoDetectionFromRaw({ box: [0, 0, 0.5, 0.5], classIndex: 200, score: 0.9 }, 100, 100)).toBeNull();
    expect(cocoDetectionFromRaw({ box: [0.5, 0.5, 0.5, 0.5], classIndex: 70, score: 0.9 }, 100, 100)).toBeNull();
    expect(cocoDetectionFromRaw(toiletRaw, 0, 100)).toBeNull();
  });
});

describe("cocoDetectionsFromRaw → domain 連携", () => {
  it("toilet 検出が pickToiletDetection と overlayBoxFromDetection にそのまま載る", () => {
    const raws: RawSsdDetection[] = [
      { box: [0.1, 0.1, 0.2, 0.2], classIndex: 1, score: 0.95 }, // person
      { box: [0.4, 0.3, 0.8, 0.7], classIndex: 70, score: 0.6 }, // toilet
      { box: [0.5, 0.5, 0.9, 0.9], classIndex: 70, score: 0.9 }, // toilet（高スコア）
    ];
    const detections = cocoDetectionsFromRaw(raws, 1080, 1920);
    expect(detections).toHaveLength(3);

    const picked = pickToiletDetection(detections);
    expect(picked?.class).toBe("toilet");
    expect(picked?.score).toBe(0.9);

    const box = overlayBoxFromDetection(picked!, 1080, 1920, 390, 390);
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo((0.9 - 0.5) * 1080 * (390 / 1080));
  });
});

describe("SSD_LABELS", () => {
  it("toilet は labelmap index 70（COCO category_id 70）", () => {
    expect(SSD_LABELS[70]).toBe("toilet");
    expect(SSD_LABELS).toHaveLength(91);
  });
});

describe("TOILET_DETECTOR_MODEL アセット", () => {
  it("ssd-model.ts の require 先 .tflite が存在する", () => {
    const source = readFileSync(resolve(__dirname, "./ssd-model.ts"), "utf8");
    const match = source.match(/require\("(.+?\.tflite)"\)/);
    expect(match).not.toBeNull();
    expect(existsSync(resolve(__dirname, match![1]))).toBe(true);
  });
});
