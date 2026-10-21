// ロジックの内部値（state・enum 名）を、画面に出す日本語へ変える。内部名はそのまま表示しない。
import type { Fighter, SumoEvent } from "../types";

/** 種族 id → 短い表示名（SPECIES.kind は「〜うんちくん」で長いので選択UIには使わない） */
export const SPECIES_SHORT_NAMES: Record<string, string> = {
  curry: "カレー",
  banana: "バナナ",
  ganko: "ガンコ",
};

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
