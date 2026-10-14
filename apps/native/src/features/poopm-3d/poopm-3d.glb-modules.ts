// Metro は require の静的パスしか解決できないため、GLB は1ファイルずつ列挙する。
// GLB は apps/native/assets/poopm_3d にコピーして持つ（web の public とは独立。
// 差し替える場合は web 側と同期すること）。
import type { HeadId } from "../battle/poopm-appearance";

export const POOPM_BASE_GLB_MODULE: number = require("../../../assets/poopm_3d/poopm_base.glb");

export const HEAD_VAR_GLB_MODULES: Record<HeadId, number> = {
  none: require("../../../assets/poopm_3d/head_var_none.glb"),
  "hat-a": require("../../../assets/poopm_3d/head_var_hat-a.glb"),
  "hat-b": require("../../../assets/poopm_3d/head_var_hat-b.glb"),
  "hat-c": require("../../../assets/poopm_3d/head_var_hat-c.glb"),
  "hat-d": require("../../../assets/poopm_3d/head_var_hat-d.glb"),
  "hat-e": require("../../../assets/poopm_3d/head_var_hat-e.glb"),
  "hat-f": require("../../../assets/poopm_3d/head_var_hat-f.glb"),
};
