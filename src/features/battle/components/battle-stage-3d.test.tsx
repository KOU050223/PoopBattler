import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BattleStage3D } from "@/features/battle/components/battle-stage-3d";

const PROPS = {
  player: {
    appearance: { color: "a", eyes: "eye-a", mouth: "mouth-a" },
    motion: { name: "idle", nonce: 0 },
  },
  enemy: {
    appearance: { color: "orange", eyes: "eye-g", mouth: "mouth-g" },
    motion: { name: "idle", nonce: 0 },
  },
  speed: 1,
} as const;

describe("BattleStage3D", () => {
  it("SSRでDOMラッパーだけ描画でき、three に触れずに落ちない", () => {
    const markup = renderToStaticMarkup(<BattleStage3D {...PROPS} />);
    expect(markup).toContain("absolute inset-0");
  });
});
