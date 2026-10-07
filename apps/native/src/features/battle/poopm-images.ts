// apps/web の PNG パーツを相対参照で共有する（コピーしない）。Metro は require の静的パスしか解決できない。
import type { ImageSourcePropType } from "react-native";

import type { BodyColorId, EyeId, HeadId, MouthId } from "./poopm-appearance";

export const BODY_IMAGES: Record<BodyColorId, ImageSourcePropType> = {
  "a": require("../../../../web/public/assets/poopm_parts/body/poopm_body_a.png"),
  "blue": require("../../../../web/public/assets/poopm_parts/body/poopm_body_blue.png"),
  "charcoal": require("../../../../web/public/assets/poopm_parts/body/poopm_body_charcoal.png"),
  "cyan": require("../../../../web/public/assets/poopm_parts/body/poopm_body_cyan.png"),
  "gold": require("../../../../web/public/assets/poopm_parts/body/poopm_body_gold.png"),
  "green": require("../../../../web/public/assets/poopm_parts/body/poopm_body_green.png"),
  "mint": require("../../../../web/public/assets/poopm_parts/body/poopm_body_mint.png"),
  "orange": require("../../../../web/public/assets/poopm_parts/body/poopm_body_orange.png"),
  "pink": require("../../../../web/public/assets/poopm_parts/body/poopm_body_pink.png"),
  "purple": require("../../../../web/public/assets/poopm_parts/body/poopm_body_purple.png"),
  "red": require("../../../../web/public/assets/poopm_parts/body/poopm_body_red.png"),
  "white": require("../../../../web/public/assets/poopm_parts/body/poopm_body_white.png"),
  "yellow": require("../../../../web/public/assets/poopm_parts/body/poopm_body_yellow.png"),
};

export const HEAD_IMAGES: Record<HeadId, ImageSourcePropType> = {
  none: require("../../../../web/public/assets/poopm_parts/hat/poopm_hat_none.png"),
  "hat-a": require("../../../../web/public/assets/poopm_parts/hat/poopm_hat_a.png"),
  "hat-b": require("../../../../web/public/assets/poopm_parts/hat/poopm_hat_b.png"),
  "hat-c": require("../../../../web/public/assets/poopm_parts/hat/poopm_hat_c.png"),
  "hat-d": require("../../../../web/public/assets/poopm_parts/hat/poopm_hat_d.png"),
  "hat-e": require("../../../../web/public/assets/poopm_parts/hat/poopm_hat_e.png"),
  "hat-f": require("../../../../web/public/assets/poopm_parts/hat/poopm_hat_f.png"),
};

export const EYE_IMAGES: Record<EyeId, ImageSourcePropType> = {
  "eye-a": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_a.png"),
  "eye-b": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_b.png"),
  "eye-c": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_c.png"),
  "eye-d": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_d.png"),
  "eye-e": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_e.png"),
  "eye-f": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_f.png"),
  "eye-g": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_g.png"),
  "eye-h": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_h.png"),
  "eye-i": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_i.png"),
  "eye-j": require("../../../../web/public/assets/poopm_parts/eyes/poopm_eye_j.png"),
};

export const MOUTH_IMAGES: Record<MouthId, ImageSourcePropType> = {
  "mouth-a": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_a.png"),
  "mouth-b": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_b.png"),
  "mouth-c": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_c.png"),
  "mouth-d": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_d.png"),
  "mouth-e": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_e.png"),
  "mouth-f": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_f.png"),
  "mouth-g": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_g.png"),
  "mouth-h": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_h.png"),
  "mouth-i": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_i.png"),
  "mouth-j": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_j.png"),
  "mouth-k": require("../../../../web/public/assets/poopm_parts/mouth/poopm_mouth_k.png"),
};
