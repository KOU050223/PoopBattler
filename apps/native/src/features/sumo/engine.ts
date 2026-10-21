// うんち相撲のロジック（描画なし）。ブラウザ試作の LOGIC 部分の移植。
// 時刻・乱数・描画は持たない。乱数は Game.rand、通知は Game.emit に注入する。
import { CFG, MODE_FULL } from "./config";
import { brain } from "./ai";
import { isAtEdge, opponentOf } from "./board";
import type { ActArg, ActKind, Ai, Difficulty, Fighter, Game, HitType, Mode, Side, Species, SumoEvent } from "./types";

export interface NewGameOptions {
  speciesEast: Species;
  speciesWest: Species;
  diff: Difficulty;
  mode?: Mode;
  rand: () => number;
  onEvent?: (event: SumoEvent) => void;
  /** NPC が操作する側。既定は西だけ NPC */
  npc?: [boolean, boolean];
  /** 東西で番付を分けたいとき */
  diffs?: [Difficulty, Difficulty];
}

export function makeFighter(side: Side, sp: Species): Fighter {
  return {
    side,
    sp,
    dir: side === 0 ? 1 : -1,
    state: "idle",
    t: 0,
    dur: 0,
    move: null,
    stam: 100,
    gauge: 0,
    last: null,
    run: 0,
    repMult: 1,
    release: false,
    charge: 0,
    windId: 0,
    dodgeAct: 0,
    dodgeDir: 1,
    special: false,
    armor: false,
    spMult: 1,
    unparryable: false,
    buffer: null,
    idleT: 0,
    pspam: 0,
    pspamT: 0,
    hot: 0,
    hits: 0,
    parries: 0,
    blocks: 0,
    guards: 0,
    idir: 0,
    riposte: 0,
    parryAct: 0,
    dir7: 0,
    pdir: 0,
    pushBase: 20,
    autoRelease: 0,
    ripHit: false,
  };
}

export function newAi(): Ai {
  return {
    lungeParry: -1,
    parryAt: 0,
    parryDir: 3,
    next: 600,
    seen: "",
    reactAt: 0,
    reactFor: null,
    willRead: false,
    feintAt: 0,
    releaseAt: 0,
    mashAcc: 0,
  };
}

export function newGame(options: NewGameOptions): Game {
  return {
    pos: 0,
    target: 0,
    t: 0,
    phase: "fight",
    f: [makeFighter(0, options.speciesEast), makeFighter(1, options.speciesWest)],
    diff: options.diff,
    diffs: options.diffs,
    mode: options.mode ?? MODE_FULL,
    rand: options.rand,
    emit: options.onEvent ?? (() => {}),
    clinch: null,
    winner: null,
    km: "",
    lastKm: "",
    freeze: 0,
    ai: [newAi(), newAi()],
    npc: options.npc ?? [false, true],
  };
}

// ai.ts も使うので board.ts に置き、engine.ts ⇄ ai.ts の循環参照を避ける。公開 API は変えない
export { isAtEdge, opponentOf };

export function setState(f: Fighter, state: Fighter["state"], dur: number, move?: Fighter["move"]): void {
  f.state = state;
  f.t = 0;
  f.dur = dur;
  if (move !== undefined) f.move = move;
}

/** 入力・AI の手を受け付ける。受け付けたら true */
export function act(g: Game, f: Fighter, kind: ActKind, arg?: ActArg): boolean {
  if (g.phase !== "fight") return false;
  if (kind === "grabRelease") {
    if (f.state === "windup" && f.move === "grab") f.release = true;
    return true;
  }
  if (kind === "inashiEnd") {
    if (f.state === "inashi") {
      // すぐ離した（＝パリィ狙いの空振り）なら隙ができる。置き続けたあとなら隙なし
      if (f.t < CFG.parry.tot) {
        f.pspam++;
        f.pspamT = 1500;
        setState(f, "recover", Math.max(150, CFG.parry.tot - f.t), null);
      } else setState(f, "idle", 0, null);
    }
    return true;
  }
  if (f.state === "windup") return false; // 出した手は取り消せない
  if (f.state === "inashi" && kind !== "inashi") setState(f, "idle", 0, null); // いなしを解いてそのまま次の手へ
  if (f.state !== "idle") {
    if ((f.state === "recover" || f.state === "dodge") && f.dur - f.t < 160) {
      const bufferedDir = typeof arg === "object" ? arg.dir : arg;
      f.buffer = kind === "inashi" ? { kind: "parry", arg: bufferedDir } : { kind, arg };
    }
    return false;
  }
  // 守り: 構えた瞬間の短い間がパリィ、そのあと置き続ける間がいなし
  if (kind === "parry") return act(g, f, "inashi", { dir: typeof arg === "number" ? arg : 0, dur: CFG.parry.tot });
  if (kind === "inashi") {
    if (f.stam < 4) {
      g.emit({ type: "gas", side: f.side });
      return false;
    }
    const inashiArg = typeof arg === "object" ? arg : undefined;
    f.idir = inashiArg?.dir ?? 0;
    f.pdir = f.idir;
    // 空振りを続けると受付が短くなる
    f.parryAct = (g.mode.parryAct ?? CFG.parry.act) * (f.sp.fav === "parry" ? 1.3 : 1) * Math.pow(0.7, Math.min(3, f.pspam));
    setState(f, "inashi", inashiArg?.dur || 1e9, "inashi");
    return true;
  }
  if (kind === "special") return actSpecial(g, f);

  const cost = f.hot > 0 ? 0 : CFG[kind].cost;
  if (f.stam < cost) {
    g.emit({ type: "gas", side: f.side });
    return false;
  }
  f.stam -= cost;
  const tsukiDir = typeof arg === "number" ? arg : 3;
  // 突きは方向ごとに別の手として数える（方向を散らせば弱くならない）
  const key = kind === "tsuki" ? `tsuki${tsukiDir}` : kind;
  const rep = f.last === key && !(f.hot > 0) && g.mode.hasRepeatPenalty ? f.run : 0;
  f.repMult = Math.pow(CFG.repDecay, rep);
  if (f.last === key) f.run++;
  else {
    f.last = key;
    f.run = 1;
  }
  if (rep) g.emit({ type: "rep", side: f.side, mult: f.repMult });
  f.special = false;
  f.unparryable = false;
  f.armor = false;
  f.spMult = 1;
  f.autoRelease = 0;
  f.ripHit = false;
  if (kind === "tsuki") {
    f.dir7 = tsukiDir;
    const spec = CFG.dirSpec[f.dir7] ?? CFG.dirSpec[3];
    f.pushBase = spec[1];
    f.ripHit = f.riposte > 0;
    f.windId++;
    setState(f, "windup", f.hot > 0 ? CFG.hot.wind : f.ripHit ? CFG.riposteWind : spec[0], "tsuki");
    if (f.ripHit) g.emit({ type: "text", side: f.side, text: "riposte" });
    f.riposte = 0;
    g.emit({ type: "wind", side: f.side, move: "tsuki" });
  } else if (kind === "grab") {
    f.windId++;
    f.release = false;
    f.charge = 0;
    setState(f, "windup", CFG.grab.max, "grab");
    g.emit({ type: "wind", side: f.side, move: "grab" });
  } else {
    f.dodgeDir = typeof arg === "number" && arg ? arg : 1;
    f.dodgeAct = (isAtEdge(g, f) ? CFG.dodge.actEdge : CFG.dodge.act) * (0.6 + 0.4 * f.repMult);
    setState(f, "dodge", CFG.dodge.tot, "dodge");
  }
  return true;
}

function actSpecial(g: Game, f: Fighter): boolean {
  if (!g.mode.hasSpecial) return false;
  if (f.gauge < 100) return false;
  f.gauge = 0;
  f.special = true;
  const id = f.sp.special.id;
  if (id === "busou") {
    f.unparryable = true;
    f.spMult = 2.2;
    f.dir7 = g.rand() < 0.5 ? 0 : 6;
    f.pushBase = 20;
    f.windId++;
    setState(f, "windup", 260, "tsuki");
  } else if (id === "suberi") {
    setState(f, "stance", 1200, "stance");
  } else {
    f.armor = true;
    f.spMult = 1.7;
    f.release = false;
    f.charge = 0;
    f.windId++;
    setState(f, "windup", 650, "grab");
    f.autoRelease = 650;
  }
  g.emit({ type: "text", side: f.side, text: "special" });
  return true;
}

function startActive(g: Game, f: Fighter): void {
  setState(f, "active", f.move === "tsuki" ? CFG.tsuki.act : CFG.grab.act);
  resolveHit(g, f, opponentOf(g, f));
}

function applyDefense(g: Game, amount: number, defender: Fighter): number {
  let scaled = amount / defender.sp.mass;
  if (isAtEdge(g, defender)) scaled /= defender.sp.grit;
  if (defender.stam < 10) scaled *= 1.3;
  return scaled;
}

function push(g: Game, f: Fighter, amount: number, kimarite: string): number {
  const amt = Math.round(amount * g.mode.push); // 序盤は一押しが大きく、短い取組で決着する
  g.target += f.dir * amt;
  g.lastKm = kimarite;
  if (g.target >= CFG.OUT || g.target <= -CFG.OUT) {
    g.target = Math.max(-CFG.OUT - 15, Math.min(CFG.OUT + 15, g.target));
    g.phase = "end";
    const winner: Side = g.target > 0 ? 0 : 1;
    g.winner = winner;
    g.km = kimarite;
    g.emit({ type: "end", winner });
  }
  return amt;
}

function resolveHit(g: Game, a: Fighter, d: Fighter): void {
  const mv = a.move;
  const isDefenderStancing = d.state === "stance";
  // パリィ: 突きは方向が合えば、四つはどの方向でも弾く
  if (d.state === "inashi" && d.t < d.parryAct && (mv === "grab" || d.idir === a.dir7)) return block(g, d, a);
  if (mv === "tsuki") {
    if (isDefenderStancing) return parry(g, d, a, true);
    if ((d.state === "active" && d.move === "tsuki") || (d.state === "windup" && d.move === "tsuki" && d.dur - d.t < 60)) {
      setState(a, "stagger", 260);
      setState(d, "stagger", 260);
      g.emit({ type: "text", side: a.side, text: "aiuchi" });
      return;
    }
    // いなし: 構えた方向から来た突きだけ受け流す
    if (d.state === "inashi" && d.idir === a.dir7 && !a.unparryable) return parry(g, d, a, false);
    return hit(g, a, d, "tsuki");
  }
  if (mv === "grab") {
    if (isDefenderStancing) return parry(g, d, a, true);
    if (
      (d.state === "active" && d.move === "grab") ||
      d.state === "lunge" ||
      (d.state === "windup" && d.move === "grab" && d.t > CFG.grab.min * 0.6)
    ) {
      return startClinch(g);
    }
    return hit(g, a, d, d.state === "inashi" ? "catch" : "grab");
  }
}

function hit(g: Game, a: Fighter, d: Fighter, type: HitType): void {
  let amt = type === "tsuki" ? a.pushBase : type === "grab" ? CFG.grab.push : CFG.grab.catchPush;
  amt *= a.sp.power * a.repMult;
  if (type !== "tsuki") amt *= 1 + 0.35 * a.charge;
  const favoriteKey = type === "tsuki" ? "tsuki" : "grab";
  let kimarite: string;
  if (a.special) {
    amt *= a.spMult;
    kimarite = a.sp.special.name;
  } else {
    if (a.sp.fav === favoriteKey) amt *= 1.4;
    kimarite = type === "tsuki" ? "突き出し" : type === "catch" ? "寄り倒し" : "寄り切り";
  }
  if (type === "tsuki" && a.ripHit) {
    amt *= CFG.riposteMult;
    kimarite = "返し突き";
  }
  if (a.hot > 0) amt *= CFG.hot.mult;
  amt = applyDefense(g, amt, d);
  if (d.armor && type === "tsuki") amt *= 0.4;
  else setState(d, "stagger", type === "tsuki" ? CFG.stagHit : CFG.stagGrab, null);
  if (d.state === "stagger") {
    d.special = false;
    d.armor = false;
  }
  a.gauge = Math.min(100, a.gauge + (type === "catch" ? 30 : 20));
  d.gauge = Math.min(100, d.gauge + 8);
  a.hits++;
  const pushed = push(g, a, amt, kimarite);
  g.emit({ type: "hit", attacker: a.side, defender: d.side, hitType: type, push: pushed });
}

/** いなし／皮すべらせ。d が受け流した側、a が攻めた側 */
function parry(g: Game, d: Fighter, a: Fighter, isStance: boolean): void {
  setState(a, "stagger", isStance ? CFG.stagParried : CFG.inashi.stag, null);
  a.special = false;
  a.armor = false;
  let amt = CFG.counter * d.sp.power;
  let kimarite = "突き落とし";
  if (isStance) {
    amt *= 1.9;
    kimarite = d.sp.special.name;
  }
  const isEdge = isAtEdge(g, d);
  if (isEdge) {
    amt *= 2;
    if (!isStance) kimarite = "うっちゃり";
  }
  amt = applyDefense(g, amt, a);
  if (!isStance) setState(d, "recover", isEdge ? 0 : 140, null);
  d.gauge = Math.min(100, d.gauge + 28);
  d.parries++;
  if (isEdge && !isStance && g.mode.hasHot) {
    d.hot = CFG.hot.dur;
    g.emit({ type: "hot", side: d.side });
  }
  const pushed = push(g, d, amt, kimarite);
  g.emit({ type: "parry", defender: d.side, attacker: a.side, isEdge, isStance, push: pushed });
}

/** パリィ受付内の成功。d が弾いた側 */
function block(g: Game, d: Fighter, a: Fighter): void {
  setState(a, "stagger", CFG.parry.stag, null);
  a.special = false;
  a.armor = false;
  a.ripHit = false;
  a.stam = Math.max(0, a.stam - CFG.parry.drain);
  setState(d, "recover", 60, null);
  d.riposte = CFG.riposteT;
  d.stam = Math.min(100, d.stam + CFG.parry.refund);
  d.gauge = Math.min(100, d.gauge + CFG.parry.gauge);
  d.blocks++;
  d.pspam = 0;
  // 弾いた勢いで少し押し返す。土俵際なら大きく押し返す（うっちゃり）
  const isEdge = isAtEdge(g, d);
  const amt = isEdge ? CFG.counter * d.sp.power * 2 : CFG.parry.knock * d.sp.power;
  if (isEdge && g.mode.hasHot) {
    d.hot = CFG.hot.dur;
    setState(d, "recover", 0, null);
  }
  const pushed = push(g, d, applyDefense(g, amt, a), isEdge ? "うっちゃり" : "突き落とし");
  g.emit({ type: "block", defender: d.side, attacker: a.side, isEdge, push: pushed });
  if (isEdge && g.mode.hasHot) g.emit({ type: "hot", side: d.side });
}

const CLINCH_MS = 1700;

function startClinch(g: Game): void {
  g.clinch = { t: 0, dur: CLINCH_MS, taps: [0, 0], lean: 0 };
  for (const f of g.f) {
    setState(f, "clinch", CLINCH_MS, "clinch");
    f.special = false;
    f.armor = false;
  }
  g.emit({ type: "clinch", isStart: true });
}

/** がっぷり中の連打1回 */
export function clinchTap(g: Game, f: Fighter): void {
  if (!g.clinch || g.phase !== "fight") return;
  // 連打の数（四つが得意なら少し多く数える）で綱引き。押すのは終わったときに勝った側だけ
  g.clinch.taps[f.side] += f.sp.fav === "grab" ? 1.25 : 1;
  const diff = g.clinch.taps[0] - g.clinch.taps[1];
  g.clinch.lean = Math.max(-12, Math.min(12, diff * 1.3)); // 見た目だけ寄る
}

function endClinch(g: Game, c: NonNullable<Game["clinch"]>): void {
  for (const f of g.f) setState(f, "recover", 300, null);
  g.emit({ type: "clinch", isStart: false });
  const diff = c.taps[0] - c.taps[1];
  if (Math.abs(diff) < 1.5) {
    g.emit({ type: "clinchWin", winner: null, loser: null, push: 0, tapDiff: 0 }); // ほぼ互角なら分かれる
    return;
  }
  const w = g.f[diff > 0 ? 0 : 1];
  const l = opponentOf(g, w);
  let amt = (16 + Math.min(30, Math.abs(diff) * 2.2)) * w.sp.power;
  if (w.hot > 0) amt *= CFG.hot.mult;
  amt = applyDefense(g, amt, l);
  setState(l, "stagger", 450, null);
  setState(w, "recover", 150, null);
  w.gauge = Math.min(100, w.gauge + 20);
  w.hits++;
  const pushed = push(g, w, amt, w.sp.fav === "grab" ? "がぶり寄り" : "寄り切り");
  g.emit({ type: "clinchWin", winner: w.side, loser: l.side, push: pushed, tapDiff: Math.abs(diff) });
}

/** 時間を dt(ms) 進める。固定ステップ(STEP_MS)で呼ぶこと */
export function update(g: Game, dt: number): void {
  if (g.phase !== "fight") {
    g.pos += (g.target - g.pos) * Math.min(1, dt * 0.008);
    return;
  }
  if (g.freeze > 0) {
    g.freeze -= dt;
    return;
  }
  g.t += dt;
  if (g.clinch) {
    g.clinch.t += dt;
    if (g.clinch.t >= g.clinch.dur) {
      const c = g.clinch;
      g.clinch = null;
      endClinch(g, c);
    }
  }
  for (const f of g.f) {
    tickFighter(g, f, dt);
    if (g.phase !== "fight") break;
  }
  for (const f of g.f) if (g.npc[f.side] && g.phase === "fight") brain(g, f, dt, { act, clinchTap });
  g.pos += (g.target + (g.clinch ? g.clinch.lean : 0) - g.pos) * Math.min(1, dt * 0.014);
}

function tickFighter(g: Game, f: Fighter, dt: number): void {
  f.t += dt;
  if (f.riposte > 0) f.riposte -= dt;
  if (f.hot > 0) f.hot -= dt;
  if (f.pspamT > 0) {
    f.pspamT -= dt;
    if (f.pspamT <= 0) f.pspam = 0;
  }
  if (f.state === "inashi") {
    f.idleT = 0;
    f.stam = Math.max(0, f.stam - (CFG.inashi.drain * dt) / 1000);
    if (f.stam <= 0) {
      setState(f, "idle", 0, null);
      g.emit({ type: "gas", side: f.side });
    }
  } else if (f.state === "idle") {
    f.idleT += dt;
    f.stam = Math.min(100, f.stam + ((f.idleT > 300 ? CFG.regen : CFG.regenBusy) * dt) / 1000);
  } else {
    f.idleT = 0;
    f.stam = Math.min(100, f.stam + (CFG.regenBusy * dt) / 1000);
  }
  switch (f.state) {
    case "windup":
      if (f.move === "grab") {
        f.charge = Math.min(1, f.t / (f.autoRelease || CFG.grab.max));
        const isReleased = f.release && f.t >= (f.hot > 0 ? CFG.hot.grabMin : CFG.grab.min);
        if (isReleased || (f.autoRelease && f.t >= f.autoRelease) || f.t >= CFG.grab.max) {
          setState(f, "lunge", CFG.grab.lunge, "grab");
          g.emit({ type: "lunge", side: f.side });
        }
      } else if (f.t >= f.dur) startActive(g, f);
      break;
    case "lunge":
      if (f.t >= f.dur) startActive(g, f);
      break;
    case "inashi":
    case "active":
    case "recover":
    case "parry":
    case "stagger":
    case "dodge":
    case "stance":
      if (f.t >= f.dur) finishTimedState(g, f);
      break;
  }
}

function finishTimedState(g: Game, f: Fighter): void {
  if (f.state === "stance") {
    f.special = false;
    setState(f, "recover", 200, null);
    return;
  }
  if (f.state === "inashi" && f.dur <= CFG.parry.tot) {
    f.pspam++;
    f.pspamT = 1500;
  }
  setState(f, "idle", 0, null);
  f.special = false;
  f.armor = false;
  if (f.buffer) {
    const buffered = f.buffer;
    f.buffer = null;
    act(g, f, buffered.kind, buffered.arg);
  }
}
