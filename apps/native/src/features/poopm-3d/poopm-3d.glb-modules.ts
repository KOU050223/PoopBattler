// Metro は require の静的パスしか解決できないため、GLB は1ファイルずつ列挙する。
// apps/web の public をコピーせず相対参照する（poopm-images.ts と同方式）。
import type { HeadId } from "../battle/poopm-appearance";

export const POOPM_BASE_GLB_MODULE: number = require("../../../../web/public/assets/poopm_3d/poopm_base.glb");

export const HEAD_VAR_GLB_MODULES: Record<HeadId, number> = {
  none: require("../../../../web/public/assets/poopm_3d/head_var_none.glb"),
  "hat-a": require("../../../../web/public/assets/poopm_3d/head_var_hat-a.glb"),
  "hat-b": require("../../../../web/public/assets/poopm_3d/head_var_hat-b.glb"),
  "hat-c": require("../../../../web/public/assets/poopm_3d/head_var_hat-c.glb"),
  "hat-d": require("../../../../web/public/assets/poopm_3d/head_var_hat-d.glb"),
  "hat-e": require("../../../../web/public/assets/poopm_3d/head_var_hat-e.glb"),
  "hat-f": require("../../../../web/public/assets/poopm_3d/head_var_hat-f.glb"),
};
