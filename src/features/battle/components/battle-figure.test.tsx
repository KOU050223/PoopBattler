import { existsSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BattleFigure, CHARGE_SWIRL_PNG } from "./battle-figure";

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
  it("チャージ中だけ渦巻き画像を表示する", () => {
    const idleMarkup = renderToStaticMarkup(<BattleFigure {...BASE_PROPS} />);
    const chargingMarkup = renderToStaticMarkup(
      <BattleFigure {...BASE_PROPS} charging />,
    );

    expect(idleMarkup).not.toContain(CHARGE_SWIRL_PNG);
    expect(chargingMarkup).toContain(CHARGE_SWIRL_PNG);
    expect(chargingMarkup).toContain('aria-hidden="true"');
    expect(chargingMarkup).not.toContain("border-t-night-ink");
    expect(chargingMarkup).not.toContain("data-spinning");
  });

  it("渦巻き画像が public 配下にある", () => {
    expect(existsSync(join(process.cwd(), "public", CHARGE_SWIRL_PNG))).toBe(
      true,
    );
  });
});
