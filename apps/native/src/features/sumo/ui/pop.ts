// ロジックのイベント → 画面中央に出す決着のポップ文字。文言は試作の FX に合わせる。
import { CFG } from "../config";
import type { Fighter, Side, SumoEvent } from "../types";

export type PopTone = "east" | "west" | "parry" | "dodge" | "special" | "grab" | "hot" | "warn" | "neutral";

export interface Pop {
  text: string;
  sub: string;
  tone: PopTone;
  /** 他のポップに上書きされないよう、出すのを遅らせる量(ms) */
  delayMs: number;
}

export const sideName = (side: Side): string => (side === 0 ? "東" : "西");
const sideTone = (side: Side): PopTone => (side === 0 ? "east" : "west");

const pop = (text: string, sub: string, tone: PopTone, delayMs = 0): Pop => ({ text, sub, tone, delayMs });

/** 熱のポップは、同じ瞬間に出るパリィ/いなしのポップの後に見せる */
export const HOT_POP_DELAY_MS = 420;

/**
 * fighters はイベントが出た時点の状態（必殺中か、返し突きか）を読むために使う。
 * 自分に関係のないイベントは出さない（息切れ・返し突きなど、自分の判断に使うもの）
 */
export function popFor(event: SumoEvent, fighters: readonly [Fighter, Fighter], playerSide: Side): Pop | null {
  switch (event.type) {
    case "hit": {
      const attacker = fighters[event.attacker];
      const label = attacker.special
        ? attacker.sp.special.name
        : event.hitType === "tsuki"
          ? "突き"
          : event.hitType === "catch"
            ? "捕まえた！"
            : "寄り";
      return pop(label, `${sideName(event.attacker)}が ${event.push} 押し込む`, sideTone(event.attacker));
    }
    case "parry":
      return pop(
        event.isEdge ? "うっちゃり！" : "いなした！",
        `${sideName(event.defender)}が ${event.push} 押し返す`,
        "dodge",
      );
    case "block":
      return pop(
        event.isEdge ? "うっちゃり！" : "パリィ！",
        event.defender === playerSide ? "返し突きのチャンス！" : `${sideName(event.defender)}が弾いた。${sideName(playerSide)}の息 −${CFG.parry.drain}`,
        "parry",
      );
    case "clinch":
      return event.isStart ? pop("がっぷり！", "", "grab") : null;
    case "clinchWin":
      if (event.winner === null) return pop("分け", "互角。仕切り直し", "neutral");
      return pop(
        event.winner === playerSide ? "寄り切った！" : "寄り切られた！",
        `${sideName(event.winner)}が ${event.push} 押し込む`,
        sideTone(event.winner),
      );
    case "text":
      if (event.text === "special") {
        const isPlayer = event.side === playerSide;
        return pop(fighters[event.side].sp.special.name, isPlayer ? `${sideName(event.side)}の必殺` : `${sideName(event.side)}の必殺！`, "special");
      }
      if (event.text === "aiuchi") return pop("相打ち", "", "neutral");
      return event.side === playerSide ? pop("返し突き", "", "parry") : null;
    case "gas":
      return event.side === playerSide ? pop("息切れ", "少し待つと息が戻る", "warn") : null;
    case "hot":
      return pop(
        "熱！",
        event.side === playerSide ? `${CFG.hot.dur / 1000}秒間 畳みかけろ！` : `${sideName(event.side)}が勢いづいた！`,
        "hot",
        HOT_POP_DELAY_MS,
      );
    default:
      return null;
  }
}

/** 同じ手を続けて弱くなっているときのヒント文。自分の分だけ出す */
export function repeatHintFor(event: SumoEvent, playerSide: Side): string | null {
  return event.type === "rep" && event.side === playerSide ? `同じ手の連続 ×${event.mult.toFixed(2)}` : null;
}
