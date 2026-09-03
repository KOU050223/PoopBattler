import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BODY_PNG, EYES_PNG, HEAD_PNG, LIMBS_PNG, MOUTH_PNG } from "./poopm.assets";
import { BODY_COLOR_IDS, EYE_IDS, HEAD_IDS, MOUTH_IDS } from "./poopm.types";

function publicPathExists(assetPath: string) {
  return existsSync(join(process.cwd(), "public", assetPath));
}

describe("poopm assets", () => {
  it("型で定義した全パーツに画像パスがある", () => {
    for (const id of BODY_COLOR_IDS) expect(BODY_PNG[id]).toBeTruthy();
    for (const id of HEAD_IDS) expect(HEAD_PNG[id]).toBeTruthy();
    for (const id of EYE_IDS) expect(EYES_PNG[id]).toBeTruthy();
    for (const id of MOUTH_IDS) expect(MOUTH_PNG[id]).toBeTruthy();
  });

  it("アセットマップの画像が public 配下に存在する", () => {
    const paths = [
      ...Object.values(BODY_PNG),
      ...Object.values(HEAD_PNG),
      ...Object.values(EYES_PNG),
      ...Object.values(MOUTH_PNG),
      ...Object.values(LIMBS_PNG),
    ];

    for (const path of paths) {
      expect(publicPathExists(path), path).toBe(true);
    }
  });
});
