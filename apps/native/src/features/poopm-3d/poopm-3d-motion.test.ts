import { describe, expect, it, vi } from "vitest";

import { POOPM_3D_CLIPS } from "@/features/poopm-3d/poopm-3d-assets";
import {
  POOPM_3D_BATTLE_MOTIONS,
  POOPM_3D_MOTION,
} from "@/features/poopm-3d/poopm-3d-motion";

vi.mock("@/features/battle/poopm-images", () => ({ EYE_IMAGES: {}, MOUTH_IMAGES: {} }));
vi.mock("@/features/poopm-3d/poopm-3d-glb-modules", () => ({
  POOPM_BASE_GLB_MODULE: 0,
  HEAD_VAR_GLB_MODULES: {},
}));

describe("POOPM_3D_MOTION", () => {
  it("すべてのモーションが GLB のクリップ名に解決される", () => {
    for (const motion of POOPM_3D_BATTLE_MOTIONS) {
      const spec = POOPM_3D_MOTION[motion];
      expect(POOPM_3D_CLIPS).toContain(spec.clip);
      expect(["repeat", "once"]).toContain(spec.loop);
      expect(spec.fadeMs).toBeGreaterThan(0);
    }
  });

  it("idle・special_charge・run はループ、それ以外は1回再生", () => {
    expect(POOPM_3D_MOTION.idle.loop).toBe("repeat");
    expect(POOPM_3D_MOTION.special_charge.loop).toBe("repeat");
    expect(POOPM_3D_MOTION.run.loop).toBe("repeat");
    for (const motion of POOPM_3D_BATTLE_MOTIONS) {
      if (motion === "idle" || motion === "special_charge" || motion === "run") continue;
      expect(POOPM_3D_MOTION[motion].loop).toBe("once");
    }
  });

  it("heal クリップはバトルモーションに含めない（Issue #199 で使用予定）", () => {
    expect(POOPM_3D_CLIPS).toContain("heal");
    expect(POOPM_3D_BATTLE_MOTIONS).not.toContain("heal");
  });
});
