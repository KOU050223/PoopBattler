import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GachaStage3D } from "@/features/battle/components/gacha-stage-3d";

const PROPS = {
  appearance: { color: "orange", eyes: "eye-g", mouth: "mouth-g", head: "hat-c" },
  reduceMotion: true,
} as const;

describe("GachaStage3D", () => {
  it("SSRでDOMラッパーだけ描画でき、three に触れずに落ちない", () => {
    const markup = renderToStaticMarkup(<GachaStage3D {...PROPS} />);
    expect(markup).toContain("absolute inset-0");
  });
});
