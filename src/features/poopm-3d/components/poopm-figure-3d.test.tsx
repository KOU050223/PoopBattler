import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PoopmFigure3D } from "@/features/poopm-3d/components/poopm-figure-3d";

const PROPS = {
  appearance: { color: "orange", eyes: "eye-g", mouth: "mouth-g", head: "hat-c" },
  motion: "idle",
  label: "カレーうんちくん",
} as const;

describe("PoopmFigure3D", () => {
  it("SSRでDOMラッパーとラベルだけ描画でき、three に触れずに落ちない", () => {
    const markup = renderToStaticMarkup(<PoopmFigure3D {...PROPS} />);
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="カレーうんちくん"');
  });
});
