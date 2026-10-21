// HUD の色。色の「役割」は試作のまま（突=黄 / 四=赤 / 受=緑 / 避=青 / 必殺=紫 / 東=青 / 西=赤 / 熱=橙）、
// 色味はアプリの theme に合わせた明るい背景向けの値。theme に無い色だけここに置く。
import { colors } from "@/theme";

import type { PopTone } from "./pop";
import type { StaminaTone, TelegraphTone } from "./hud";

export interface ToneColor {
  /** 文字・リング・枠 */
  main: string;
  /** 面の薄い塗り */
  wash: string;
}

export const TELEGRAPH_COLORS: Record<TelegraphTone, ToneColor> = {
  tsuki: { main: "#b87900", wash: "#fff1cc" },
  grab: { main: "#d04a4a", wash: "#ffe3e3" },
  parry: { main: "#2f9a57", wash: "#dff5e7" },
  dodge: { main: colors.sparkBlue, wash: "#dbeefa" },
  special: { main: "#8a5cd0", wash: "#eee5fb" },
  down: { main: colors.pencilGray, wash: "#eeeeee" },
};

export const SIDE_COLORS = { east: colors.sparkBlue, west: "#d04a4a" } as const;

export const STAMINA_COLORS: Record<StaminaTone, string> = { high: "#3fae6a", mid: "#e0a800", low: "#d04a4a" };

export const SPECIAL_COLOR = TELEGRAPH_COLORS.special.main;
export const HEAT_COLOR = "#ff7a1f";

export const POP_COLORS: Record<PopTone, string> = {
  east: SIDE_COLORS.east,
  west: SIDE_COLORS.west,
  parry: TELEGRAPH_COLORS.parry.main,
  dodge: TELEGRAPH_COLORS.dodge.main,
  special: SPECIAL_COLOR,
  grab: TELEGRAPH_COLORS.grab.main,
  hot: HEAT_COLOR,
  warn: SIDE_COLORS.west,
  neutral: colors.charcoal,
};
