import { describe, expect, it } from "vitest";
import {
  HURDLE_TAP_MAX_DISTANCE_M,
  IDLE,
  SWIPE_AXIS_DOMINANCE,
  SWIPE_MIN_DISTANCE_DP,
  SWIPE_WIDTH_RATIO,
  shouldAcceptHurdleTap,
  swipeThresholdPx,
  touchCancel,
  touchDown,
  touchMove,
  touchUp,
} from "./input";

const WIDTH = 400;
const START = { x: 200, y: 500 };
const press = (x = START.x, y = START.y, atMs = 1000) => touchDown(IDLE, { x, y, width: WIDTH, atMs });
const THRESHOLD = swipeThresholdPx(WIDTH);
const release = (dx: number, dy: number, width = WIDTH) =>
  touchUp(press().phase, { x: START.x + dx, y: START.y + dy, width });
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
    const amount = THRESHOLD + 0.01;
    expect(swipesOf(release(sx * amount, sy * amount).commands)).toEqual([{ type: "swipe", dir }]);
  });

  it("しきい値ちょうどの移動ではスワイプにならない", () => {
    expect(swipesOf(release(THRESHOLD, 0).commands)).toHaveLength(0);
  });

  it("しきい値を0.01px超えるとスワイプになる", () => {
    expect(swipesOf(release(THRESHOLD + 0.01, 0).commands)).toHaveLength(1);
  });

  it("縦横に動かしたときは移動量の大きい軸で向きが決まる", () => {
    expect(swipesOf(release(20, -80).commands)).toEqual([{ type: "swipe", dir: "up" }]);
  });

  it("試作の28pxでは届かない（実機で指がずれただけで通っていた距離）", () => {
    expect(swipesOf(release(28.01, 0).commands)).toHaveLength(0);
  });
});

describe("swipe の斜め判定", () => {
  const major = THRESHOLD + 10;

  it("大きい軸が小さい軸のちょうど倍率分なら向きが定まりスワイプになる", () => {
    expect(swipesOf(release(major, major / SWIPE_AXIS_DOMINANCE).commands)).toEqual([{ type: "swipe", dir: "right" }]);
  });

  it("大きい軸が倍率に少し足りない斜めは無視する", () => {
    expect(swipesOf(release(major, major / SWIPE_AXIS_DOMINANCE + 0.01).commands)).toHaveLength(0);
  });

  it("ほぼ45度の斜めは無視する", () => {
    expect(swipesOf(release(major, -major).commands)).toHaveLength(0);
  });

  it("斜めを無視しても長押しは0に戻る", () => {
    expect(release(major, major).commands).toEqual([{ type: "hold", dir: 0 }]);
  });
});

describe("swipeThresholdPx", () => {
  it("狭い画面では最低値を使う", () => {
    expect(swipeThresholdPx(200)).toBe(SWIPE_MIN_DISTANCE_DP);
  });

  it("広い画面では幅に比例して大きくなる", () => {
    expect(swipeThresholdPx(1000)).toBe(1000 * SWIPE_WIDTH_RATIO);
  });

  it("幅が0（レイアウト前）でも最低値を下回らない", () => {
    expect(swipeThresholdPx(0)).toBe(SWIPE_MIN_DISTANCE_DP);
  });

  it("画面幅が広いと同じ移動量でもスワイプにならない", () => {
    const distance = swipeThresholdPx(400) + 1;
    expect(swipesOf(release(distance, 0, 400).commands)).toHaveLength(1);
    expect(swipesOf(release(distance, 0, 1000).commands)).toHaveLength(0);
  });
});

describe("touchUp", () => {
  it("指を置いていない状態で離しても何も出ない", () => {
    expect(touchUp(IDLE, { x: 0, y: 0, width: WIDTH }).commands).toEqual([]);
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

describe("touchMove（動かした瞬間のスワイプ）", () => {
  const pressed = () => press().phase;
  const move = (phase: ReturnType<typeof pressed>, dx: number, dy: number) =>
    touchMove(phase, { x: START.x + dx, y: START.y + dy, width: WIDTH });

  it("しきい値を初めて超えて動かした瞬間にスワイプが1回出る", () => {
    expect(move(pressed(), THRESHOLD + 0.01, 0).commands).toEqual([{ type: "swipe", dir: "right" }]);
  });

  it("しきい値に届かない動きでは何も出ず、押した状態のまま", () => {
    const step = move(pressed(), THRESHOLD, 0);
    expect(step.commands).toEqual([]);
    expect(step.phase).toEqual(pressed());
  });

  it("斜めの動きでは出ない", () => {
    expect(move(pressed(), THRESHOLD + 10, THRESHOLD + 10).commands).toEqual([]);
  });

  it("出したあとに動かし続けても2回目は出ない", () => {
    const first = move(pressed(), THRESHOLD + 1, 0);
    expect(move(first.phase, THRESHOLD + 50, 0).commands).toEqual([]);
  });

  it("出したあとに逆向きへ動かしても2回目は出ない", () => {
    const first = move(pressed(), THRESHOLD + 1, 0);
    expect(swipesOf(move(first.phase, -(THRESHOLD + 50), 0).commands)).toHaveLength(0);
  });

  it("出したあとに離してもスワイプは出ず、長押しだけ0に戻る", () => {
    const first = move(pressed(), THRESHOLD + 1, 0);
    const up = touchUp(first.phase, { x: START.x + THRESHOLD + 50, y: START.y, width: WIDTH });
    expect(up.commands).toEqual([{ type: "hold", dir: 0 }]);
  });

  it("移動を取りこぼしても、離したときに条件を満たしていればスワイプが出る", () => {
    expect(swipesOf(release(THRESHOLD + 1, 0).commands)).toEqual([{ type: "swipe", dir: "right" }]);
  });

  it("次に押し直せばまたスワイプが出せる", () => {
    const first = move(pressed(), THRESHOLD + 1, 0);
    const up = touchUp(first.phase, { x: START.x, y: START.y, width: WIDTH });
    expect(move(press().phase, THRESHOLD + 1, 0).commands).toHaveLength(1);
    expect(up.phase).toEqual(IDLE);
  });

  it("指を置いていない状態で動かしても何も出ない", () => {
    expect(touchMove(IDLE, { x: 999, y: 999, width: WIDTH }).commands).toEqual([]);
  });
});
