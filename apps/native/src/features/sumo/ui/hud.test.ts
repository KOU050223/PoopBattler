import { describe, expect, it } from "vitest";
import { CFG, DIFF_JONOKUCHI, DIFF_YOKOZUNA, SPECIES } from "../config";
import { makeFighter } from "../engine";
import { manualGame } from "../test-helpers";
import type { Fighter } from "../types";
import {
  clinchHudOf,
  edgeZones,
  fanGeometry,
  fanPath,
  fanStateOf,
  ghostDrainMs,
  heatRatio,
  isSpecialReady,
  positionPercent,
  resultStatsOf,
  specialRatio,
  staminaTone,
  telegraphOf,
  warnDirOf,
} from "./hud";
import { DIR_LEFT, DIR_RIGHT } from "./input";

const fighter = (patch: Partial<Fighter> = {}): Fighter => ({ ...makeFighter(1, SPECIES[0]), ...patch });

describe("staminaTone", () => {
  it.each([
    [100, "high"],
    [50, "high"],
    [49, "mid"],
    [22, "mid"],
    [21, "low"],
    [0, "low"],
  ] as const)("息 %i は %s", (stamina, expected) => {
    expect(staminaTone(stamina)).toBe(expected);
  });
});

describe("ghostDrainMs", () => {
  it("息が減ったときだけ、減った量に比例した時間をかけて残像を縮める", () => {
    expect(ghostDrainMs(100, 70)).toBeCloseTo(500);
  });

  it("息が増えたとき・変わらないときは待たない", () => {
    expect(ghostDrainMs(50, 80)).toBe(0);
    expect(ghostDrainMs(50, 50)).toBe(0);
  });
});

describe("positionPercent", () => {
  it("中央は50%", () => {
    expect(positionPercent(0)).toBe(50);
  });

  it("土俵の端（±OUT）で便器の位置（96% / 4%）に届く", () => {
    expect(positionPercent(CFG.OUT)).toBeCloseTo(96);
    expect(positionPercent(-CFG.OUT)).toBeCloseTo(4);
  });

  it("OUT を超えても端で止まる", () => {
    expect(positionPercent(CFG.OUT + 15)).toBeCloseTo(96);
    expect(positionPercent(-999)).toBeCloseTo(4);
  });
});

describe("edgeZones", () => {
  it("土俵際の帯は、東側が4%から、西側が96%まで。幅は左右で同じ", () => {
    const zones = edgeZones();
    expect(zones.east.left).toBeCloseTo(4);
    expect(zones.west.left + zones.west.width).toBeCloseTo(96);
    expect(zones.east.width).toBeCloseTo(zones.west.width);
  });

  it("帯の内側の端が、土俵際の位置（±EDGE）と一致する", () => {
    const zones = edgeZones();
    expect(zones.east.left + zones.east.width).toBeCloseTo(positionPercent(-CFG.EDGE));
    expect(zones.west.left).toBeCloseTo(positionPercent(CFG.EDGE));
  });
});

describe("必殺ゲージ", () => {
  it("割合は0〜1に収める", () => {
    expect(specialRatio(-5)).toBe(0);
    expect(specialRatio(40)).toBeCloseTo(0.4);
    expect(specialRatio(130)).toBe(1);
  });

  it("100 で使える", () => {
    expect(isSpecialReady(99)).toBe(false);
    expect(isSpecialReady(100)).toBe(true);
  });
});

describe("telegraphOf（相手の予告マーク）", () => {
  it("突きの構え中は『突』と、方向の矢印・構えの進み具合を出す", () => {
    const mark = telegraphOf(fighter({ state: "windup", move: "tsuki", t: 100, dur: 400, dir7: 6 }));
    expect(mark).toEqual({ glyph: "突", tone: "tsuki", ring: 0.25, arrow: DIR_LEFT });
  });

  it("必殺の突きは紫", () => {
    const mark = telegraphOf(fighter({ state: "windup", move: "tsuki", t: 0, dur: 400, dir7: 0, special: true }));
    expect(mark?.tone).toBe("special");
  });

  it("四つの溜め中は『四』と溜め具合のリング（矢印なし）", () => {
    const mark = telegraphOf(fighter({ state: "windup", move: "grab", charge: 0.6 }));
    expect(mark).toEqual({ glyph: "四", tone: "grab", ring: 0.6, arrow: null });
  });

  it("四つを離した瞬間は『！』", () => {
    expect(telegraphOf(fighter({ state: "lunge", move: "grab" }))?.glyph).toBe("！");
  });

  it("いなしの受付中は『受』、過ぎたら息の残りを表す『避』", () => {
    const base = { state: "inashi" as const, idir: 0, parryAct: 240, stam: 40 };
    expect(telegraphOf(fighter({ ...base, t: 100 }))).toEqual({ glyph: "受", tone: "parry", ring: 1, arrow: DIR_RIGHT });
    expect(telegraphOf(fighter({ ...base, t: 300 }))).toEqual({ glyph: "避", tone: "dodge", ring: 0.4, arrow: DIR_RIGHT });
  });

  it("いなしの向きが真上(3)なら矢印は出さない", () => {
    expect(telegraphOf(fighter({ state: "inashi", idir: 3, t: 500, parryAct: 240 }))?.arrow).toBeNull();
  });

  it("パリィ状態は受付の間だけ『受』", () => {
    expect(telegraphOf(fighter({ state: "parry", t: 100, parryAct: 240 }))?.glyph).toBe("受");
    expect(telegraphOf(fighter({ state: "parry", t: 300, parryAct: 240 }))).toBeNull();
  });

  it("必殺の構えは『構』、崩れは『崩』。どちらも残り時間でリングが減る", () => {
    expect(telegraphOf(fighter({ state: "stance", t: 300, dur: 1200 }))).toEqual({ glyph: "構", tone: "special", ring: 0.75, arrow: null });
    expect(telegraphOf(fighter({ state: "stagger", t: 0, dur: 600 }))).toEqual({ glyph: "崩", tone: "down", ring: 1, arrow: null });
  });

  it("待機中は何も出さない", () => {
    expect(telegraphOf(fighter({ state: "idle" }))).toBeNull();
  });

  it("構えの長さが0でもリングが NaN にならない", () => {
    expect(telegraphOf(fighter({ state: "windup", move: "tsuki", t: 0, dur: 0, dir7: 0 }))?.ring).toBe(1);
  });
});

describe("fanStateOf（守りの扇）", () => {
  const player = (patch: Partial<Fighter>) => ({ ...makeFighter(0, SPECIES[0]), ...patch });

  it("何もなければ待機", () => {
    expect(fanStateOf(player({}), DIR_LEFT, null)).toBe("idle");
  });

  it("相手の突きの予告がある側は warn", () => {
    expect(fanStateOf(player({}), DIR_LEFT, DIR_LEFT)).toBe("warn");
    expect(fanStateOf(player({}), DIR_RIGHT, DIR_LEFT)).toBe("idle");
  });

  it("指を置いた側は hold（パリィ受付が過ぎ、予告もない場合）", () => {
    const held = player({ state: "inashi", idir: DIR_RIGHT, t: 500, parryAct: 240 });
    expect(fanStateOf(held, DIR_RIGHT, null)).toBe("hold");
    expect(fanStateOf(held, DIR_LEFT, null)).toBe("idle");
  });

  it("置いた直後のパリィ受付中は parry", () => {
    const held = player({ state: "inashi", idir: DIR_LEFT, t: 100, parryAct: 240 });
    expect(fanStateOf(held, DIR_LEFT, null)).toBe("parry");
  });

  it("予告された側に置いていれば、受付が過ぎていても parry", () => {
    const held = player({ state: "inashi", idir: DIR_LEFT, t: 500, parryAct: 240 });
    expect(fanStateOf(held, DIR_LEFT, DIR_LEFT)).toBe("parry");
  });

  it("予告と逆側に置くと hold のまま。予告側は warn", () => {
    const held = player({ state: "inashi", idir: DIR_RIGHT, t: 500, parryAct: 240 });
    expect(fanStateOf(held, DIR_RIGHT, DIR_LEFT)).toBe("hold");
    expect(fanStateOf(held, DIR_LEFT, DIR_LEFT)).toBe("warn");
  });
});

describe("warnDirOf", () => {
  const windup = fighter({ state: "windup", move: "tsuki", dir7: 6 });

  it("予告を出す番付では、相手の突きの構え中だけ方向を返す", () => {
    const { game } = manualGame();
    game.diff = DIFF_JONOKUCHI;
    expect(warnDirOf(game, windup)).toBe(DIR_LEFT);
    expect(warnDirOf(game, fighter({ state: "windup", move: "grab" }))).toBeNull();
  });

  it("予告を出さない番付（横綱）では null", () => {
    const { game } = manualGame();
    game.diff = DIFF_YOKOZUNA;
    expect(warnDirOf(game, windup)).toBeNull();
  });
});

describe("fanPath / fanGeometry", () => {
  it("基準点は画面下の中央、半径は幅の46%と高さの30%の小さい方", () => {
    expect(fanGeometry(400, 800)).toEqual({ centerX: 200, centerY: 640, radius: 184 });
  });

  it("画面が低いときは、基準点を下端から150px上までに収める", () => {
    expect(fanGeometry(400, 500).centerY).toBe(350);
  });

  it("右の扇は基準点の右、左の扇は左にある（x の中心が基準点を挟む）", () => {
    const g = fanGeometry(400, 800);
    const xsOf = (path: string) => [...path.matchAll(/(-?\d+\.\d),(-?\d+\.\d)/g)].map((m) => Number(m[1]));
    expect(Math.max(...xsOf(fanPath(g, DIR_RIGHT)))).toBeGreaterThan(g.centerX + g.radius * 0.9);
    expect(Math.min(...xsOf(fanPath(g, DIR_LEFT)))).toBeLessThan(g.centerX - g.radius * 0.9);
  });
});

describe("heatRatio", () => {
  it("熱の残りを割合で返し、熱でなければ0", () => {
    expect(heatRatio(fighter({ hot: CFG.hot.dur / 2 }))).toBe(0.5);
    expect(heatRatio(fighter({ hot: 0 }))).toBe(0);
  });
});

describe("clinchHudOf / resultStatsOf", () => {
  it("がっぷりでなければ null、中は連打数を切り捨てて返す", () => {
    const { game } = manualGame();
    expect(clinchHudOf(game)).toBeNull();
    game.clinch = { t: 0, dur: 1000, taps: [3.9, 5.2], lean: 0 };
    expect(clinchHudOf(game)).toEqual({ east: 3, west: 5 });
  });

  it("決着画面の統計は、取組時間を小数1桁、パリィは弾いた+受け止めた回数", () => {
    const { game } = manualGame();
    game.t = 12345;
    game.f[0].hits = 7;
    game.f[0].parries = 2;
    game.f[0].blocks = 1;
    expect(resultStatsOf(game, 0)).toEqual({ seconds: "12.3", hits: 7, parries: 3 });
  });
});
