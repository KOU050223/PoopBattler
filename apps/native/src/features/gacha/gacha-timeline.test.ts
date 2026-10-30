import { describe, expect, it } from "vitest";

import {
  DROP_MS,
  DROP_CAMERA,
  IDLE_CAMERA,
  MIN_TOILET_SCALE,
  REDUCED_MS,
  RESULT_CAMERA,
  SLAM_MS,
  SPIN_MS,
  SPIN_TURNS,
  TOTAL_MS,
  WIDE_CAMERA,
  cameraPosition,
  frameAt,
  swirlAngle,
  waterLevel,
} from "./gacha-timeline";

const SPIN_END = DROP_MS + SPIN_MS;

describe("frameAt（通常）", () => {
  it("演出前は上アングルで石が浮いている", () => {
    const frame = frameAt(null);
    expect(frame).toMatchObject({ phase: "idle", camera: IDLE_CAMERA, toiletScale: 1, stoneProgress: 0 });
  });

  it("フェーズは drop → spin → slam → done の順に進む", () => {
    const phases = [0, DROP_MS, SPIN_END, TOTAL_MS].map((ms) => frameAt(ms).phase);
    expect(phases).toEqual(["drop", "spin", "slam", "done"]);
  });

  it("石は落ちるにつれて進み、回転が始まると消える", () => {
    expect(frameAt(DROP_MS / 2).stoneProgress).toBeGreaterThan(0);
    expect(frameAt(DROP_MS / 2).stoneProgress).toBeLessThan(1);
    expect(frameAt(DROP_MS).stoneProgress).toBeNull();
  });

  it("石が落ちる間にカメラが開口へ寄っていく", () => {
    const start = frameAt(0).camera.distance;
    const end = frameAt(DROP_MS - 1).camera.distance;
    expect(end).toBeLessThan(start);
    expect(end).toBeCloseTo(DROP_CAMERA.distance, 1);
  });

  it("回転が始まる瞬間は、寄ったカメラ位置から引き始める", () => {
    expect(frameAt(DROP_MS).camera).toEqual(DROP_CAMERA);
  });

  it("回転中は便器が小さくなり、カメラが引く", () => {
    const end = frameAt(SPIN_END - 1);
    expect(end.toiletScale).toBeCloseTo(MIN_TOILET_SCALE, 1);
    expect(end.camera.distance).toBeCloseTo(WIDE_CAMERA.distance, 1);
  });

  it("回転は加速していく（後半のほうが角速度が大きい）", () => {
    const delta = (from: number) => frameAt(DROP_MS + from + 50).toiletYaw - frameAt(DROP_MS + from).toiletYaw;
    expect(delta(SPIN_MS - 200)).toBeGreaterThan(delta(200));
  });

  it("回転が始まって最初の 0.3 秒では、まだ四分の一回転も回らない", () => {
    expect(frameAt(DROP_MS + 300).toiletYaw).toBeLessThan(Math.PI / 2);
  });

  it("便器が四分の一回転するころには、カメラは大きく引いている", () => {
    const quarterTurn = Array.from({ length: SPIN_MS }, (_, ms) => frameAt(DROP_MS + ms)).find((f) => f.toiletYaw >= Math.PI / 2);
    expect(quarterTurn?.camera.distance).toBeGreaterThan((DROP_CAMERA.distance + WIDE_CAMERA.distance) / 2);
  });

  it("回転の総量はちょうど整数回転で、止まると正面を向く", () => {
    expect(frameAt(SPIN_END - 0.001).toiletYaw / (Math.PI * 2)).toBeCloseTo(SPIN_TURNS, 2);
    expect(frameAt(SPIN_END).toiletYaw).toBe(0);
  });

  it("止まった直後はまだ小さく、弾みで元の大きさを一度超えてから戻る", () => {
    expect(frameAt(SPIN_END).toiletScale).toBeCloseTo(MIN_TOILET_SCALE, 1);
    const peak = Math.max(...Array.from({ length: 30 }, (_, i) => frameAt(SPIN_END + (SLAM_MS * i) / 30).toiletScale));
    expect(peak).toBeGreaterThan(1);
    expect(frameAt(TOTAL_MS).toiletScale).toBe(1);
  });

  it("終わると結果用のカメラ位置に落ち着く", () => {
    expect(frameAt(TOTAL_MS).camera).toEqual(RESULT_CAMERA);
  });

  it("水は回転の終わりに空になり、止まる瞬間から戻って満水になる", () => {
    expect(frameAt(DROP_MS - 1).water).toBe(1);
    expect(frameAt(SPIN_END - 0.001).water).toBeCloseTo(0, 1);
    expect(frameAt(SPIN_END + SLAM_MS / 4).water).toBeGreaterThan(0.5);
    expect(frameAt(TOTAL_MS).water).toBe(1);
  });

  it("レバーは回転の間だけ押されている", () => {
    expect([frameAt(DROP_MS - 1), frameAt(DROP_MS + 1), frameAt(SPIN_END + 1)].map((f) => f.isHandlePressed)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("負の経過時間は開始時として扱う", () => {
    expect(frameAt(-100).phase).toBe("drop");
  });
});

describe("frameAt（視差効果を減らす）", () => {
  it("回転もカメラ移動もせず、短い待ちのあと done になる", () => {
    const waiting = frameAt(REDUCED_MS - 1, true);
    expect(waiting).toMatchObject({ phase: "spin", toiletYaw: 0, toiletScale: 1, camera: RESULT_CAMERA });
    expect(frameAt(REDUCED_MS, true).phase).toBe("done");
  });
});

describe("waterLevel / swirlAngle / cameraPosition", () => {
  it("水は最初満水で、終わると空になる", () => {
    expect(waterLevel(0)).toBe(1);
    expect(waterLevel(1)).toBe(0);
    expect(waterLevel(0.6)).toBeGreaterThan(waterLevel(0.8));
  });

  it("渦は終わりまでに3回転する", () => {
    expect(Math.abs(swirlAngle(1))).toBeCloseTo(Math.PI * 2 * 3);
  });

  it("真上に近いほどカメラは高く、手前に出ない", () => {
    const top = cameraPosition({ distance: 10, elevationDeg: 90 }, 1);
    expect(top[1]).toBeCloseTo(11);
    expect(top[2]).toBeCloseTo(0);
    expect(cameraPosition({ distance: 10, elevationDeg: 0 }, 1)).toEqual([0, 1, 10]);
  });
});
