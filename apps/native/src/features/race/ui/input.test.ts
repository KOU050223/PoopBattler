import { describe, expect, it } from "vitest";
import {
  HURDLE_TAP_MAX_DISTANCE_M,
  IDLE,
  SWIPE_THRESHOLD_PX,
  shouldAcceptHurdleTap,
  touchCancel,
  touchDown,
  touchUp,
} from "./input";

const WIDTH = 400;
const START = { x: 200, y: 500 };
const press = (x = START.x, y = START.y, atMs = 1000) => touchDown(IDLE, { x, y, width: WIDTH, atMs });
const release = (dx: number, dy: number) =>
  touchUp(press().phase, { x: START.x + dx, y: START.y + dy });
const swipesOf = (commands: { type: string }[]) => commands.filter((command) => command.type === "swipe");

describe("tap", () => {
  it("指を置いた瞬間に実時間つきのタップが1回出る", () => {
    const taps = press(100, 500, 1234).commands.filter((command) => command.type === "tap");
    expect(taps).toEqual([{ type: "tap", atMs: 1234 }]);
  });

  it("離したときには追加のタップが出ない", () => {
    const taps = release(0, 0).commands.filter((command) => command.type === "tap");
    expect(taps).toHaveLength(0);
  });
});

describe("hold", () => {
  it("左半分を置くと向き -1 の長押しが始まる", () => {
    expect(press(100).commands).toContainEqual({ type: "hold", dir: -1 });
  });

  it("右半分を置くと向き +1 の長押しが始まる", () => {
    expect(press(300).commands).toContainEqual({ type: "hold", dir: 1 });
  });

  it("ちょうど中央を置くと向き +1 になる", () => {
    expect(press(WIDTH / 2).commands).toContainEqual({ type: "hold", dir: 1 });
  });

  it("離すと向き 0 に戻る", () => {
    expect(release(0, 0).commands).toContainEqual({ type: "hold", dir: 0 });
  });
});

describe("swipe", () => {
  it.each([
    ["up", 0, -1],
    ["down", 0, 1],
    ["left", -1, 0],
    ["right", 1, 0],
  ] as const)("しきい値を超えて動かして離すと %s のスワイプ", (dir, sx, sy) => {
    const amount = SWIPE_THRESHOLD_PX + 0.01;
    expect(swipesOf(release(sx * amount, sy * amount).commands)).toEqual([{ type: "swipe", dir }]);
  });

  it("しきい値ちょうどの移動ではスワイプにならない", () => {
    expect(swipesOf(release(SWIPE_THRESHOLD_PX, 0).commands)).toHaveLength(0);
  });

  it("しきい値を0.01px超えるとスワイプになる", () => {
    expect(swipesOf(release(SWIPE_THRESHOLD_PX + 0.01, 0).commands)).toHaveLength(1);
  });

  it("縦横に動かしたときは移動量の大きい軸で向きが決まる", () => {
    expect(swipesOf(release(20, -40).commands)).toEqual([{ type: "swipe", dir: "up" }]);
  });
});

describe("touchUp", () => {
  it("指を置いていない状態で離しても何も出ない", () => {
    expect(touchUp(IDLE, { x: 0, y: 0 }).commands).toEqual([]);
  });
});

describe("touchCancel", () => {
  it("キャンセルでは大きく動いていてもスワイプが出ない", () => {
    expect(swipesOf(touchCancel(press().phase).commands)).toHaveLength(0);
  });

  it("キャンセルすると向き 0 に戻る", () => {
    expect(touchCancel(press().phase).commands).toEqual([{ type: "hold", dir: 0 }]);
  });
});

describe("shouldAcceptHurdleTap", () => {
  it("次のハードルまでちょうど8mのタップは受ける", () => {
    expect(shouldAcceptHurdleTap(HURDLE_TAP_MAX_DISTANCE_M)).toBe(true);
  });

  it("次のハードルまで8.01mのタップは無視する", () => {
    expect(shouldAcceptHurdleTap(8.01)).toBe(false);
  });
});
