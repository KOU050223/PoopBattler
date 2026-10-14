import { describe, expect, it } from "vitest";

import {
  POOPM_3D_CLIPS,
  POOPM_3D_GLB,
} from "@/features/poopm-3d/poopm-3d.assets";
import {
  POOPM_3D_BATTLE_MOTIONS,
  POOPM_3D_MOTION,
} from "@/features/poopm-3d/poopm-3d.motion";

describe("POOPM_3D_MOTION", () => {
  it("すべてのモーションが GLB のクリップ名に解決される", () => {
    for (const motion of POOPM_3D_BATTLE_MOTIONS) {
      const spec = POOPM_3D_MOTION[motion];
      expect(POOPM_3D_CLIPS).toContain(spec.clip);
      expect(["repeat", "once"]).toContain(spec.loop);
      expect(spec.fadeMs).toBeGreaterThan(0);
    }
  });

  it("idle と special_charge はループ、それ以外は1回再生", () => {
    expect(POOPM_3D_MOTION.idle.loop).toBe("repeat");
    expect(POOPM_3D_MOTION.special_charge.loop).toBe("repeat");
    for (const motion of POOPM_3D_BATTLE_MOTIONS) {
      if (motion === "idle" || motion === "special_charge") continue;
      expect(POOPM_3D_MOTION[motion].loop).toBe("once");
    }
  });

  it("ko / lose / win も1回再生にする（終端姿勢の保持は再生後の指示側が決める）", () => {
    expect(POOPM_3D_MOTION.ko.loop).toBe("once");
    expect(POOPM_3D_MOTION.lose.loop).toBe("once");
    expect(POOPM_3D_MOTION.win.loop).toBe("once");
  });

  it("heal クリップはバトルモーションに含めない（Issue #199 で使用予定）", () => {
    expect(POOPM_3D_CLIPS).toContain("heal");
    expect(POOPM_3D_BATTLE_MOTIONS).not.toContain("heal");
  });
});

describe("POOPM_3D_GLB", () => {
  it("public/assets/poopm_3d 配下のパスを指す", () => {
    expect(POOPM_3D_GLB).toBe("/assets/poopm_3d/poopm_base.glb");
  });
});
