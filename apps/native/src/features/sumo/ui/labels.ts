// ロジックの内部値（state・enum 名）を、画面に出す日本語へ変える。内部名はそのまま表示しない。
import type { Fighter, SumoEvent } from "../types";

/** 種族 id → 短い表示名（SPECIES.kind は「〜うんちくん」で長いので選択UIには使わない） */
export const SPECIES_SHORT_NAMES: Record<string, string> = {
  curry: "カレー",
  banana: "バナナ",
  ganko: "ガンコ",
};

/** モードの説明（Mode 自体は数値だけを持つ） */
export const MODE_DESCRIPTIONS: Record<string, string> = {
  early: "ストーリー序盤の想定。全体がゆっくり流れ、パリィの受付が広く、一押しが大きいので短く決着する。必殺・熱・同じ手の連続で弱くなる仕組みはなし",
  full: "ストーリー後半や対戦の想定。今までの全部入り",
};

/** 画面下のヒント（操作の早見）。key を太字で出す */
export const CONTROL_HINTS: readonly { key: string; action: string }[] = [
  { key: "上へ", action: "突き" },
  { key: "触れる", action: "パリィ→置き続けて いなし" },
  { key: "下へ", action: "四つ" },
];

/** 開始前メニューの操作説明 */
export const CONTROL_GUIDE: readonly { term: string; description: string }[] = [
  { term: "上へスワイプ", description: "突き。画面の左右どちら側で出すかで方向が決まる" },
  {
    term: "指を置く",
    description:
      "置いた側（左か右）で守りの構え。置いた瞬間の短い間はパリィ：方向が合った突きと、方向に関係なく四つを弾く。弾くと時間がゆっくりになり、その間の返し突きは速くて1.5倍重い",
  },
  {
    term: "置き続ける",
    description:
      "そのままいなしに変わる。同じ方向の突きを受け流して押し返す。タイミングは要らないが、四つには掴まれ、息が減り続ける。すぐ離して空振りすると少し隙ができる",
  },
  { term: "下へスワイプ", description: "四つ。指を離すと出る。いなしを構えごと掴む" },
];

/** 開始前メニューの読み方の説明 */
export const READING_GUIDE =
  "相手の頭上の矢印が突きの来る方向。リングが満ちる瞬間にその側へ指を置けばパリィ。早めに置いても、置き続ければいなしで受け流せる。「避」と矢印が出たら、別の方向から突くか四つで掴む。「四」は溜めのうちに突いて潰すか、離した瞬間の「！」に合わせて指を置いてパリィ。同じ方向ばかり突くと弱くなるので散らそう。動くほど息が減り、パリィされると大きく減る。土俵際でパリィかいなしが決まればうっちゃり。決めると2.5秒間の「熱」状態になり、構えが速く、息を使わず、同じ手でも弱らず、押しが1.15倍になる。畳みかけよう。";

export type MarkTone = "neutral" | "attack" | "guard" | "down" | "hot";

export interface StateMark {
  label: string;
  tone: MarkTone;
}

/** 力士の今の状態（構え・守り・崩れ・がっぷり）を1つの短いマークにする */
export function stateMark(f: Fighter): StateMark {
  switch (f.state) {
    case "windup":
      return f.move === "grab" ? { label: "四つ溜め", tone: "attack" } : { label: "突きの構え", tone: "attack" };
    case "lunge":
    case "active":
      return { label: "攻撃", tone: "attack" };
    case "inashi":
      // パリィ受付の間だけ「パリィ」、あとはいなし
      return f.t < f.parryAct ? { label: "パリィ", tone: "guard" } : { label: "いなし", tone: "guard" };
    case "parry":
    case "dodge":
      return { label: "守り", tone: "guard" };
    case "stance":
      return { label: "必殺の構え", tone: "attack" };
    case "stagger":
      return { label: "崩れ", tone: "down" };
    case "recover":
      return { label: "硬直", tone: "down" };
    case "clinch":
      return { label: "がっぷり", tone: "attack" };
    case "idle":
      return { label: "待ち", tone: "neutral" };
  }
}

export type HapticKind = "light" | "medium" | "heavy" | "success" | "error";

/** イベント → 触覚。鳴らすのは決定的な場面だけ（自分に関わるものに絞る） */
export function hapticFor(event: SumoEvent, playerSide: 0 | 1): HapticKind | null {
  switch (event.type) {
    case "hit":
      if (event.attacker !== playerSide && event.defender !== playerSide) return null;
      return event.hitType === "tsuki" ? "medium" : "heavy";
    case "block":
      return event.defender === playerSide ? "light" : null;
    case "parry":
      return event.defender === playerSide ? "success" : null;
    case "clinch":
      return event.isStart ? "medium" : null;
    case "end":
      return event.winner === playerSide ? "success" : "error";
    default:
      return null;
  }
}
