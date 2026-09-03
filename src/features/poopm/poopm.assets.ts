import type {
  BodyColorId,
  EyeId,
  HeadId,
  MouthId,
} from "@/features/poopm/poopm.types";

type PoopmAssetPath = `/assets/poopm_parts/${string}.png`;

const ASSET_ROOT = "/assets/poopm_parts" as const;

export const LIMBS_PNG = {
  leftHand: `${ASSET_ROOT}/hands/poopm_base_lefthand.png`,
  rightHand: `${ASSET_ROOT}/hands/poopm_base_righthand.png`,
  leftLeg: `${ASSET_ROOT}/legs/poopm_base_leftleg.png`,
  rightLeg: `${ASSET_ROOT}/legs/poopm_base_rightleg.png`,
} satisfies Record<string, PoopmAssetPath>;

export const BODY_PNG: Record<BodyColorId, PoopmAssetPath> = {
  a: `${ASSET_ROOT}/body/poopm_body_a.png`,
  blue: `${ASSET_ROOT}/body/poopm_body_blue.png`,
  charcoal: `${ASSET_ROOT}/body/poopm_body_charcoal.png`,
  cyan: `${ASSET_ROOT}/body/poopm_body_cyan.png`,
  gold: `${ASSET_ROOT}/body/poopm_body_gold.png`,
  green: `${ASSET_ROOT}/body/poopm_body_green.png`,
  mint: `${ASSET_ROOT}/body/poopm_body_mint.png`,
  orange: `${ASSET_ROOT}/body/poopm_body_orange.png`,
  pink: `${ASSET_ROOT}/body/poopm_body_pink.png`,
  purple: `${ASSET_ROOT}/body/poopm_body_purple.png`,
  red: `${ASSET_ROOT}/body/poopm_body_red.png`,
  white: `${ASSET_ROOT}/body/poopm_body_white.png`,
  yellow: `${ASSET_ROOT}/body/poopm_body_yellow.png`,
};

export const HEAD_PNG: Record<HeadId, PoopmAssetPath> = {
  "hat-a": `${ASSET_ROOT}/hat/poopm_hat_a.png`,
  "hat-b": `${ASSET_ROOT}/hat/poopm_hat_b.png`,
  "hat-c": `${ASSET_ROOT}/hat/poopm_hat_c.png`,
  "hat-d": `${ASSET_ROOT}/hat/poopm_hat_d.png`,
  "hat-e": `${ASSET_ROOT}/hat/poopm_hat_e.png`,
  "hat-f": `${ASSET_ROOT}/hat/poopm_hat_f.png`,
};

export const EYES_PNG: Record<EyeId, PoopmAssetPath> = {
  "eye-a": `${ASSET_ROOT}/eyes/poopm_eye_a.png`,
  "eye-b": `${ASSET_ROOT}/eyes/poopm_eye_b.png`,
  "eye-c": `${ASSET_ROOT}/eyes/poopm_eye_c.png`,
  "eye-d": `${ASSET_ROOT}/eyes/poopm_eye_d.png`,
  "eye-e": `${ASSET_ROOT}/eyes/poopm_eye_e.png`,
  "eye-f": `${ASSET_ROOT}/eyes/poopm_eye_f.png`,
  "eye-g": `${ASSET_ROOT}/eyes/poopm_eye_g.png`,
  "eye-h": `${ASSET_ROOT}/eyes/poopm_eye_h.png`,
  "eye-i": `${ASSET_ROOT}/eyes/poopm_eye_i.png`,
  "eye-j": `${ASSET_ROOT}/eyes/poopm_eye_j.png`,
};

export const MOUTH_PNG: Record<MouthId, PoopmAssetPath> = {
  "mouth-a": `${ASSET_ROOT}/mouth/poopm_mouth_a.png`,
  "mouth-b": `${ASSET_ROOT}/mouth/poopm_mouth_b.png`,
  "mouth-c": `${ASSET_ROOT}/mouth/poopm_mouth_c.png`,
  "mouth-d": `${ASSET_ROOT}/mouth/poopm_mouth_d.png`,
  "mouth-e": `${ASSET_ROOT}/mouth/poopm_mouth_e.png`,
  "mouth-f": `${ASSET_ROOT}/mouth/poopm_mouth_f.png`,
  "mouth-g": `${ASSET_ROOT}/mouth/poopm_mouth_g.png`,
  "mouth-h": `${ASSET_ROOT}/mouth/poopm_mouth_h.png`,
  "mouth-i": `${ASSET_ROOT}/mouth/poopm_mouth_i.png`,
  "mouth-j": `${ASSET_ROOT}/mouth/poopm_mouth_j.png`,
  "mouth-k": `${ASSET_ROOT}/mouth/poopm_mouth_k.png`,
};
