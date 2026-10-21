import type { PopTone } from "./pop";
import { POP_COLORS } from "./palette";

export interface PopStyle {
  textColor: string;
  textShadowColor: string;
  textShadowRadius: number;
  subColor: string;
  subShadowColor: string;
}

const FLAT_SHADOW = "rgba(255,255,255,0.95)";
const FLAT_SUB_COLOR = "#4b4b4b";
const STAGE_SHADOW = "rgba(0,0,0,0.75)";
const STAGE_SUB_COLOR = "#ffffff";

// 2D 用の色相を保ったまま明るくした値。茶色の土俵や力士に埋もれないよう、暗い縁取りと組で使う
const STAGE_TEXT_COLORS: Record<PopTone, string> = {
  east: "#6cc4f5",
  west: "#ff8a8a",
  parry: "#6fe09a",
  dodge: "#6cc4f5",
  special: "#c9a6f5",
  grab: "#ff8a8a",
  hot: "#ffa860",
  warn: "#ff8a8a",
  neutral: "#ffffff",
};

export function popStyleFor(tone: PopTone, isOnStage: boolean): PopStyle {
  if (!isOnStage) {
    return {
      textColor: POP_COLORS[tone],
      textShadowColor: FLAT_SHADOW,
      textShadowRadius: 6,
      subColor: FLAT_SUB_COLOR,
      subShadowColor: "transparent",
    };
  }
  return {
    textColor: STAGE_TEXT_COLORS[tone],
    textShadowColor: STAGE_SHADOW,
    textShadowRadius: 4,
    subColor: STAGE_SUB_COLOR,
    subShadowColor: STAGE_SHADOW,
  };
}
