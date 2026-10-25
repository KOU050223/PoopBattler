import type { ImageSourcePropType } from "react-native";

import type {
  BodyColorId,
  EyeId,
  HeadId,
  MouthId,
} from "../battle/poopm-appearance";
import { EYE_IMAGES, MOUTH_IMAGES } from "../battle/poopm-images";
import {
  HEAD_VAR_GLB_MODULES,
  POOPM_BASE_GLB_MODULE,
} from "./poopm-3d-glb-modules";

// web 版は URL 文字列だが、native は Metro のアセットモジュールID（require の戻り値）を返す。
export function poopm3DBaseGlb(): number {
  return POOPM_BASE_GLB_MODULE;
}

// 頭ごと差し替えるバリアントGLB。素頭を含む全 HeadId がこの方式で、"none" がアクセなしの素頭。
export function poopm3DHeadVarGlb(head: HeadId): number {
  return HEAD_VAR_GLB_MODULES[head];
}

// GLB 内のアニメーションクリップ名。heal は戦闘では使わない（Issue #199 で使用予定）。
export const POOPM_3D_CLIPS = [
  "idle",
  "attack",
  "hit",
  "heal",
  "special_charge",
  "special_fire",
  "swap_in",
  "swap_out",
  "ko",
  "lose",
  "win",
] as const;
export type Poopm3DClip = (typeof POOPM_3D_CLIPS)[number];

// poopm_body マテリアルの baseColor に書き込む胴体色（web 版と同値）。
export const POOPM_3D_BODY_COLORS: Record<BodyColorId, string> = {
  a: "#ce9067",
  blue: "#7098e8",
  charcoal: "#504e4c",
  cyan: "#63c2da",
  gold: "#dbb355",
  green: "#69be71",
  mint: "#67cdab",
  orange: "#f09a58",
  pink: "#e984bd",
  purple: "#a277db",
  red: "#e16666",
  white: "#e9e4d9",
  yellow: "#f2d76b",
};

export function poopm3DEyeTexture(eyes: EyeId): ImageSourcePropType {
  return EYE_IMAGES[eyes];
}

export function poopm3DMouthTexture(mouth: MouthId): ImageSourcePropType {
  return MOUTH_IMAGES[mouth];
}
