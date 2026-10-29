import { describe, expect, it } from "vitest";
import {
  HURDLE_TAP_MAX_DISTANCE_M,
  IDLE,
  SWIPE_THRESHOLD_PX,
  shouldAcceptHurdleTap,
  touchDown,
  touchUp,
} from "./input";

const WIDTH = 400;
const START = { x: 200, y: 500 };
const press = (x = START.x, y = START.y) => touchDown(IDLE, { x, y, width: WIDTH }).phase;
const release = (dx: number, dy: number, atMs = 1000) =>
  touchUp(press(), { x: START.x + dx, y: START.y + dy, atMs });

describe("tap", () => {
  it("動かさずに離すとタップが実時間つきで1回出る", () => {
    const taps = release(0, 0, 1234).commands.filter((command) => command.type === "tap");
    expect(taps).toEqual([{ type: "tap", atMs: 1234 }]);
  });

  it("スワイプのしきい値に1px足りない移動で離すとタップになる", () => {
    const taps = release(0, -(SWIPE_THRESHOLD_PX - 1)).commands.filter((command) => command.type === "tap");
    expect(taps).toHaveLength(1);
  });

  it("スワイプのしきい値に1px足りない移動で離してもスワイプは出ない", () => {
    const swipes = release(SWIPE_THRESHOLD_PX - 1, 0).commands.filter((command) => command.type === "swipe");
    expect(swipes).toHaveLength(0);
  });
});

describe("hold", () => {
  it("左半分を置くと向き -1 の長押しが始まる", () => {
    expect(touchDown(IDLE, { x: 100, y: 500, width: WIDTH }).commands).toEqual([{ type: "hold", dir: -1 }]);
  });

  it("右半分を置くと向き +1 の長押しが始まる", () => {
    expect(touchDown(IDLE, { x: 300, y: 500, width: WIDTH }).commands).toEqual([{ type: "hold", dir: 1 }]);
  });

  it("離すと向き 0 に戻る", () => {
    expect(release(0, 0).commands[0]).toEqual({ type: "hold", dir: 0 });
  });
});

describe("swipe", () => {
  it.each([
    ["up", 0, -SWIPE_THRESHOLD_PX],
    ["down", 0, SWIPE_THRESHOLD_PX],
    ["left", -SWIPE_THRESHOLD_PX, 0],
    ["right", SWIPE_THRESHOLD_PX, 0],
  ] as const)("しきい値ちょうど動かして離すと %s のスワイプ", (dir, dx, dy) => {
    const swipes = release(dx, dy).commands.filter((command) => command.type === "swipe");
    expect(swipes).toEqual([{ type: "swipe", dir }]);
  });

  it("縦横に動かしたときは移動量の大きい軸で向きが決まる", () => {
    const swipes = release(20, -40).commands.filter((command) => command.type === "swipe");
    expect(swipes).toEqual([{ type: "swipe", dir: "up" }]);
  });

  it("スワイプになった指はタップを出さない", () => {
    const taps = release(SWIPE_THRESHOLD_PX, 0).commands.filter((command) => command.type === "tap");
    expect(taps).toHaveLength(0);
  });
});

describe("touchUp", () => {
  it("指を置いていない状態で離しても何も出ない", () => {
    expect(touchUp(IDLE, { x: 0, y: 0, atMs: 0 }).commands).toEqual([]);
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
