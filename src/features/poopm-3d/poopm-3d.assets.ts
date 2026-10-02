import { EYES_PNG, MOUTH_PNG } from "@/features/poopm/poopm.assets";
import type {
  BodyColorId,
  EyeId,
  HeadId,
  MouthId,
} from "@/features/poopm/poopm.types";

export const POOPM_3D_GLB = "/assets/poopm_3d/poopm_base.glb";

// 頭ごと差し替えるバリアントGLB（頭ドーム＋アクセサリ一体、ベースと同じモデル空間）。
// head_acc_<id>.glb のソケット方式は使わない（理由は docs/poopm-3d.md の既知の問題参照）。
export function poopm3DHeadVarGlb(head: HeadId): string {
  return `/assets/poopm_3d/head_var_${head}.glb`;
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

// poopm_body マテリアルの baseColor に書き込む胴体色。
// 2D版の /assets/poopm_parts/body/poopm_body_<color>.png の塗り色から抽出した値。
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

// フェイスプレートには2D版と同じ PNG をそのまま貼る（docs/poopm-3d.md）。
export function poopm3DEyeTexture(eyes: EyeId): string {
  return EYES_PNG[eyes];
}

export function poopm3DMouthTexture(mouth: MouthId): string {
  return MOUTH_PNG[mouth];
}
