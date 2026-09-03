import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BattleFigure } from "./battle-figure";

const BASE_PROPS = {
  characterId: "normal-poop",
  attribute: "normal",
  facing: "back",
  motion: "idle",
  label: "味方",
  depth: "near",
  speed: 1,
} as const;

describe("BattleFigure", () => {
  it("チャージ中だけグルグルエフェクトを表示する", () => {
    const idleMarkup = renderToStaticMarkup(<BattleFigure {...BASE_PROPS} />);
    const chargingMarkup = renderToStaticMarkup(
      <BattleFigure {...BASE_PROPS} charging />,
    );

    expect(idleMarkup).not.toContain("border-t-night-ink");
    expect(chargingMarkup).toContain("border-t-night-ink");
    expect(chargingMarkup).toContain('aria-hidden="true"');
  });
});
