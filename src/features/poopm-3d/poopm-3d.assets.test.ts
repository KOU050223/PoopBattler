import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  POOPM_3D_GLB,
  poopm3DEyeTexture,
  poopm3DHeadVarGlb,
  poopm3DMouthTexture,
} from "@/features/poopm-3d/poopm-3d.assets";
import { DEFAULT_APPEARANCE } from "@/features/poopm/poopm.appearances";
import {
  EYE_IDS,
  HEAD_IDS,
  MOUTH_IDS,
} from "@/features/poopm/poopm.types";

describe("poopm-3d assets", () => {
  it("ベースGLBが public 配下にある", () => {
    expect(existsSync(join(process.cwd(), "public", POOPM_3D_GLB))).toBe(true);
  });

  it("参照する目・口テクスチャがすべて public 配下にある", () => {
    for (const eye of EYE_IDS) {
      const path = poopm3DEyeTexture(eye);
      expect(existsSync(join(process.cwd(), "public", path)), path).toBe(true);
    }
    for (const mouth of MOUTH_IDS) {
      const path = poopm3DMouthTexture(mouth);
      expect(existsSync(join(process.cwd(), "public", path)), path).toBe(true);
    }
  });

  it("参照する頭バリアントGLBがすべて public 配下にある", () => {
    for (const head of HEAD_IDS) {
      const path = poopm3DHeadVarGlb(head);
      expect(existsSync(join(process.cwd(), "public", path)), path).toBe(true);
    }
  });

  it("既定外見の目・口が解決できる", () => {
    expect(poopm3DEyeTexture(DEFAULT_APPEARANCE.eyes)).toBe(
      "/assets/poopm_parts/eyes/poopm_eye_a.png",
    );
    expect(poopm3DMouthTexture(DEFAULT_APPEARANCE.mouth)).toBe(
      "/assets/poopm_parts/mouth/poopm_mouth_a.png",
    );
  });
});
