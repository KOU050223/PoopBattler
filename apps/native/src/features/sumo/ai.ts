// NPC の思考。入力は act() / clinchTap() と同じ口から出すので、プレイヤーと同じルールで動く。
import { CFG } from "./config";
import { isAtEdge, opponentOf } from "./board";
import type { ActArg, ActKind, Fighter, Game } from "./types";

/** engine.ts の入口。engine.ts が ai.ts を import するので、逆向きの import は作らず呼び出し側から渡してもらう */
export interface Controls {
  act: (g: Game, f: Fighter, kind: ActKind, arg?: ActArg) => boolean;
  clinchTap: (g: Game, f: Fighter) => void;
}

// 突きの方向は 0=画面の右、6=画面の左 の2つだけ使う
const SIDE_DIRS = [0, 6] as const;
const otherDir = (dir: number): number => (dir === 0 ? 6 : 0);

export function brain(g: Game, me: Fighter, dt: number, controls: Controls): void {
  const { act, clinchTap } = controls;
  const ai = g.ai[me.side];
  const o = opponentOf(g, me);
  const D = g.diffs?.[me.side] ?? g.diff;
  const R = g.rand;
  if (g.clinch) {
    ai.mashAcc += (dt * D.mash * (0.8 + 0.4 * R())) / 1000;
    while (ai.mashAcc >= 1) {
      ai.mashAcc -= 1;
      clinchTap(g, me);
    }
    return;
  }
  if (ai.parryAt && g.t >= ai.parryAt) {
    ai.parryAt = 0;
    if (act(g, me, "parry", ai.parryDir)) return;
  }
  if (me.state === "windup") {
    if (me.move === "grab" && !me.autoRelease && me.t >= ai.releaseAt) act(g, me, "grabRelease");
    return;
  }
  // notice opponent's windup
  if (o.state === "windup" && ai.seen !== `${o.windId}-${o.side}`) {
    ai.seen = `${o.windId}-${o.side}`;
    ai.reactAt = g.t + D.react * (0.85 + 0.3 * R());
    ai.reactFor = o.move;
    ai.willRead = R() < D.read;
  }
  if (ai.reactAt && g.t >= ai.reactAt) {
    ai.reactAt = 0;
    if (!ai.willRead && R() < (D.freeze ?? 0)) return; // 下位の番付は、読めないと固まる
    if (o.state === "windup" && me.state === "idle") {
      reactToWindup(g, me, o, act);
      return;
    }
  }
  if (o.state === "lunge" && ai.lungeParry === o.windId && (me.state === "idle" || me.state === "inashi")) {
    ai.lungeParry = -1;
    act(g, me, "parry", 0);
    return;
  }
  if (me.state === "inashi") {
    if (o.state === "windup" && o.move === "grab" && R() < (D.read * dt) / 120) act(g, me, "tsuki", R() < 0.5 ? 0 : 6); // 四つの溜めを見て、いなしから突く
    return;
  }
  if (me.state !== "idle") return;
  // punish
  const isOpenToPunish =
    (o.state === "stagger" && o.dur - o.t > CFG.dirSpec[0][0] - 40) ||
    (o.state === "parry" && o.t > o.parryAct && o.dur - o.t > 200) ||
    (o.state === "inashi" && o.t > 300);
  if (isOpenToPunish && R() < (D.read * (D.punish ?? 1) * dt) / 60) {
    if ((o.state === "inashi" || (o.state === "stagger" && o.dur - o.t > CFG.grab.min + 60)) && R() < 0.6) {
      act(g, me, "grab");
      ai.releaseAt = CFG.grab.min;
    } else act(g, me, "tsuki", R() < 0.5 ? 0 : 6);
    return;
  }
  if (me.hot > 0 && R() < dt / (D.rush === false ? 400 : 90)) {
    act(g, me, "tsuki", R() < 0.5 ? 0 : 6); // 熱の間は畳みかける
    return;
  }
  if (g.t < ai.next) return;
  ai.next = g.t + (650 + R() * 900) / D.aggr + (D.gap ?? 0) * (0.6 + 0.8 * R());
  if (me.stam < 25 && R() < 0.7) return;
  if (me.gauge >= 100 && (R() < 0.5 || isAtEdge(g, me))) {
    act(g, me, "special");
    return;
  }
  chooseOpening(g, me, act);
}

function reactToWindup(g: Game, me: Fighter, o: Fighter, act: Controls["act"]): void {
  const ai = g.ai[me.side];
  const R = g.rand;
  const rem = o.move === "grab" ? (o.autoRelease || CFG.grab.max) - o.t : o.dur - o.t;
  if (ai.reactFor === "tsuki") {
    if (ai.willRead && (o.unparryable || R() < 0.55)) {
      ai.parryAt = g.t + Math.max(0, rem - 140 - R() * 60);
      ai.parryDir = R() < 0.9 ? o.dir7 : otherDir(o.dir7);
    } else if (ai.willRead) act(g, me, "inashi", { dir: R() < 0.85 ? o.dir7 : otherDir(o.dir7), dur: rem + 250 });
    else if (R() < 0.35) act(g, me, "tsuki", R() < 0.5 ? 0 : 6);
    else if (R() < 0.5) act(g, me, "inashi", { dir: SIDE_DIRS[Math.floor(R() * 2)], dur: 400 + R() * 500 });
    else {
      ai.parryDir = SIDE_DIRS[Math.floor(R() * 2)];
      act(g, me, "parry", ai.parryDir);
    }
  } else if (ai.willRead && rem > CFG.dirSpec[0][0] * 0.7) act(g, me, "tsuki", R() < 0.5 ? 0 : 6);
  else if (ai.willRead) ai.lungeParry = o.windId; // 離した瞬間に合わせてパリィ
  else if (R() < 0.4) act(g, me, "inashi", { dir: SIDE_DIRS[Math.floor(R() * 2)], dur: 500 + R() * 500 });
  else if (R() < 0.5) {
    act(g, me, "grab");
    ai.releaseAt = CFG.grab.min;
  }
}

function chooseOpening(g: Game, me: Fighter, act: Controls["act"]): void {
  const ai = g.ai[me.side];
  const R = g.rand;
  const weights: Record<string, number> = { tsuki: 1, grab: 0.75, inashi: 0.3 };
  if (me.sp.fav === "tsuki") weights.tsuki += 0.8;
  else if (me.sp.fav === "grab") weights.grab += 0.8;
  else weights.inashi += 0.4;
  if (isAtEdge(g, me)) weights.inashi += 0.6;
  // 突きは last が 'tsuki0'/'tsuki6' なので、ここで弱まるのは四つといなしだけ
  if (me.last && weights[me.last]) weights[me.last] *= me.run >= 2 ? 0.35 : 0.7;
  const total = weights.tsuki + weights.grab + weights.inashi;
  let r = R() * total;
  const pick = ["tsuki", "grab", "inashi"].find((k) => (r -= weights[k]) < 0) ?? "tsuki";
  let arg: ActArg = 0;
  if (pick === "inashi") arg = { dir: SIDE_DIRS[Math.floor(R() * 2)], dur: 500 + R() * 600 };
  if (pick === "tsuki") arg = R() < 0.5 ? 0 : 6;
  act(g, me, pick as "tsuki" | "grab" | "inashi", arg);
  if (pick === "grab") ai.releaseAt = CFG.grab.min + R() * (CFG.grab.max - CFG.grab.min) * 0.7;
}
