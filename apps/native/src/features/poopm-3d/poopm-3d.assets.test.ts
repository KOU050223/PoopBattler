/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { HeadId } from "@/features/battle/poopm-appearance";
import {
  poopm3DBaseGlb,
  poopm3DEyeTexture,
  poopm3DHeadVarGlb,
  poopm3DMouthTexture,
} from "@/features/poopm-3d/poopm-3d.assets";

// vitest では .glb/.png の require を解決できないため、モジュールIDの代わりに識別用の値を返す。
vi.mock("@/features/poopm-3d/poopm-3d.glb-modules", () => ({
  POOPM_BASE_GLB_MODULE: 100,
  HEAD_VAR_GLB_MODULES: {
    none: 1, "hat-a": 2, "hat-b": 3, "hat-c": 4, "hat-d": 5, "hat-e": 6, "hat-f": 7,
  },
}));
vi.mock("@/features/battle/poopm-images", () => ({
  EYE_IMAGES: { "eye-a": "eye-a-module" },
  MOUTH_IMAGES: { "mouth-a": "mouth-a-module" },
}));

const HEAD_IDS: HeadId[] = ["none", "hat-a", "hat-b", "hat-c", "hat-d", "hat-e", "hat-f"];
const MODULE_FILE = resolve(__dirname, "../poopm-3d/poopm-3d.glb-modules.ts");
const source = readFileSync(MODULE_FILE, "utf8");

describe("poopm-3d assets", () => {
  it("ベースGLBと全頭バリアントが ID から別々のモジュールに解決される", () => {
    expect(poopm3DBaseGlb()).toBe(100);
    const ids = HEAD_IDS.map(poopm3DHeadVarGlb);
    expect(new Set(ids).size).toBe(HEAD_IDS.length);
    expect(poopm3DHeadVarGlb("hat-c")).toBe(4);
  });

  it("目・口は poopm-images のモジュールをそのまま返す", () => {
    expect(poopm3DEyeTexture("eye-a")).toBe("eye-a-module");
    expect(poopm3DMouthTexture("mouth-a")).toBe("mouth-a-module");
  });
});

describe("poopm-3d.glb-modules（require 先の実在確認）", () => {
  const paths = [...source.matchAll(/require\("([^"]+\.glb)"\)/g)].map((m) => m[1]);

  it("ベース1 + 頭バリアント全 HeadId 分の require がある", () => {
    expect(paths).toHaveLength(1 + HEAD_IDS.length);
    for (const head of HEAD_IDS) {
      expect(paths.some((p) => p.endsWith(`head_var_${head}.glb`)), head).toBe(true);
    }
  });

  it("require 先の GLB がすべてディスク上に存在する", () => {
    for (const p of paths) {
      expect(existsSync(resolve(dirname(MODULE_FILE), p)), p).toBe(true);
    }
  });
});
