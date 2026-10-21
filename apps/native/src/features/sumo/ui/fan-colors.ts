import type { FanState } from "./hud";
import { TELEGRAPH_COLORS } from "./palette";

export interface FanColors {
  fill: string;
  stroke: string;
  labelFill: string;
  /** 縁取り（暗い土俵上でラベルを読ませる）。2D では使わない */
  labelStroke: string | null;
}

const FLAT_LABEL_FILL = "rgba(75,75,75,0.6)";

const FLAT_FANS: Record<FanState, Pick<FanColors, "fill" | "stroke">> = {
  idle: { fill: "rgba(75,75,75,0.05)", stroke: "rgba(75,75,75,0.22)" },
  warn: { fill: "rgba(224,168,0,0.32)", stroke: TELEGRAPH_COLORS.tsuki.main },
  hold: { fill: "rgba(8,117,165,0.28)", stroke: TELEGRAPH_COLORS.dodge.main },
  parry: { fill: "rgba(63,174,106,0.42)", stroke: TELEGRAPH_COLORS.parry.main },
};

// 茶色の土俵に埋もれないよう白系で明るくする。力士や土俵が透けるよう塗りは半透明のまま
const STAGE_FANS: Record<FanState, Pick<FanColors, "fill" | "stroke">> = {
  idle: { fill: "rgba(255,255,255,0.2)", stroke: "rgba(255,255,255,0.5)" },
  warn: { fill: "rgba(255,196,32,0.45)", stroke: "rgba(255,214,84,0.95)" },
  hold: { fill: "rgba(64,170,235,0.42)", stroke: "rgba(120,200,250,0.95)" },
  parry: { fill: "rgba(80,205,128,0.5)", stroke: "rgba(130,230,165,0.95)" },
};

const STAGE_LABEL_FILL = "rgba(255,255,255,0.95)";
const STAGE_LABEL_STROKE = "rgba(0,0,0,0.65)";

export function fanColors(state: FanState, isOnStage: boolean): FanColors {
  if (!isOnStage) return { ...FLAT_FANS[state], labelFill: FLAT_LABEL_FILL, labelStroke: null };
  return { ...STAGE_FANS[state], labelFill: STAGE_LABEL_FILL, labelStroke: STAGE_LABEL_STROKE };
}
