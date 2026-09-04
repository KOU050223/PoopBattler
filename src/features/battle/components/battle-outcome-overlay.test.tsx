import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BattleOutcomeOverlay } from "./battle-outcome-overlay";

describe("BattleOutcomeOverlay", () => {
  it("勝利は全面を覆い、紙吹雪を出す。タップしないと閉じない", () => {
    const markup = renderToStaticMarkup(
      <BattleOutcomeOverlay outcome="win" onDismiss={() => undefined} />,
    );

    expect(markup).toContain("data-battle-outcome=\"win\"");
    expect(markup).toContain("fixed inset-0");
    expect(markup).toContain("勝利");
    expect(markup).toContain("タップしてつづける");
    expect(markup).toContain("data-confetti");
    expect(markup).not.toContain("敗北");
    expect(markup).not.toContain("Battle Clear");
  });

  it("敗北は全面を覆い、勝利と同じ紙吹雪は出さない", () => {
    const markup = renderToStaticMarkup(
      <BattleOutcomeOverlay outcome="lose" onDismiss={() => undefined} />,
    );

    expect(markup).toContain("data-battle-outcome=\"lose\"");
    expect(markup).toContain("fixed inset-0");
    expect(markup).toContain("敗北");
    expect(markup).toContain("タップしてつづける");
    expect(markup).not.toContain("data-confetti");
    expect(markup).not.toContain("勝利");
  });
});
