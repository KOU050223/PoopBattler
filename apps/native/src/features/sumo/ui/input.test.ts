import { describe, expect, it } from "vitest";
import {
  DIR_LEFT,
  DIR_RIGHT,
  IDLE,
  SWIPE_THRESHOLD_PX,
  classifySwipe,
  sideDirOfX,
  touchDown,
  touchMove,
  touchUp,
  type TouchPhase,
} from "./input";

const WIDTH = 400;
const down = (x: number, y = 600, isClinch = false) => touchDown(IDLE, { x, y, width: WIDTH, isClinch });

describe("sideDirOfX", () => {
  it("右半分は右(0)、左半分は左(6)を返す", () => {
    expect(sideDirOfX(300, WIDTH)).toBe(DIR_RIGHT);
    expect(sideDirOfX(100, WIDTH)).toBe(DIR_LEFT);
  });

  it("ちょうど中央は左扱いになる", () => {
    expect(sideDirOfX(WIDTH / 2, WIDTH)).toBe(DIR_LEFT);
  });
});

describe("classifySwipe", () => {
  it("上へ閾値ちょうど動くと突き", () => {
    expect(classifySwipe(-SWIPE_THRESHOLD_PX)).toBe("tsuki");
  });

  it("下へ閾値ちょうど動くと四つ", () => {
    expect(classifySwipe(SWIPE_THRESHOLD_PX)).toBe("grab");
  });

  it("閾値に1px足りない移動は何も起こさない", () => {
    expect(classifySwipe(SWIPE_THRESHOLD_PX - 1)).toBeNull();
    expect(classifySwipe(-(SWIPE_THRESHOLD_PX - 1))).toBeNull();
  });

  it("動いていない(0)なら何も起こさない", () => {
    expect(classifySwipe(0)).toBeNull();
  });
});

describe("touch の遷移", () => {
  it("右半分に指を置くと右向きの守りを構える", () => {
    const step = down(300);
    expect(step.commands).toEqual([{ type: "guard", dir: DIR_RIGHT }]);
    expect(step.phase.kind).toBe("guarding");
  });

  it("がっぷり中に指を置くと連打として数え、守りは構えない", () => {
    const step = down(300, 600, true);
    expect(step.commands).toEqual([{ type: "clinchTap" }]);
    expect(step.phase.kind).toBe("clinching");
  });

  it("守りの指を上へスワイプすると、置いた側の突きに切り替わる", () => {
    const { phase } = down(100, 600);
    const step = touchMove(phase, { x: 100, y: 600 - SWIPE_THRESHOLD_PX });
    expect(step.commands).toEqual([{ type: "tsuki", dir: DIR_LEFT }]);
    expect(step.phase.kind).toBe("attacked");
  });

  it("スワイプ中に指が反対側へ流れても、突きの向きは置いた側のまま", () => {
    const { phase } = down(100, 600);
    const step = touchMove(phase, { x: 350, y: 500 });
    expect(step.commands).toEqual([{ type: "tsuki", dir: DIR_LEFT }]);
  });

  it("守りの指を下へスワイプすると四つの溜めに入り、離すと放つ", () => {
    const { phase } = down(300, 400);
    const moved = touchMove(phase, { x: 300, y: 400 + SWIPE_THRESHOLD_PX });
    expect(moved.commands).toEqual([{ type: "grab" }]);
    expect(touchUp(moved.phase).commands).toEqual([{ type: "grabRelease" }]);
  });

  it("閾値未満の移動では守りのまま", () => {
    const { phase } = down(300, 400);
    const step = touchMove(phase, { x: 300, y: 400 - 10 });
    expect(step.commands).toEqual([]);
    expect(step.phase).toBe(phase);
  });

  it("守ったまま指を離すと守りを解く", () => {
    const { phase } = down(300);
    const step = touchUp(phase);
    expect(step.commands).toEqual([{ type: "guardEnd" }]);
    expect(step.phase).toEqual(IDLE);
  });

  it("突きを出したあとに離しても追加の手は出ない", () => {
    const attacked: TouchPhase = { kind: "attacked" };
    const step = touchUp(attacked);
    expect(step.commands).toEqual([]);
    expect(step.phase).toEqual(IDLE);
  });

  it("突きを出したあとに動かしても、二重に手は出ない", () => {
    const attacked: TouchPhase = { kind: "attacked" };
    expect(touchMove(attacked, { x: 0, y: -999 }).commands).toEqual([]);
  });

  it("指を置いている間は2本目の指を無視する", () => {
    const { phase } = down(300);
    expect(touchDown(phase, { x: 100, y: 600, width: WIDTH, isClinch: false }).commands).toEqual([]);
  });
});
