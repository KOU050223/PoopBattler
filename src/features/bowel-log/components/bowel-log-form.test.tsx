import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/stores/battle-store", () => ({
  useBattleStore: (selector: (state: { bowelDraft: null; setBowelDraft: () => void }) => unknown) => selector({
    bowelDraft: null,
    setBowelDraft: () => undefined,
  }),
}));

import { BowelLogForm } from "./bowel-log-form";

describe("BowelLogForm", () => {
  it("症状は任意として表示し、既存の必須4項目を維持する", () => {
    const markup = renderToStaticMarkup(<BowelLogForm onSubmit={() => undefined} />);

    expect(markup).toContain("色");
    expect(markup).toContain("赤");
    expect(markup).toContain("白・灰");
    expect(markup).toContain("気になること");
    expect(markup).toContain("選ばなくてもOK");
    expect(markup).toContain("強くいきんだ");
    expect(markup).toContain("急な便意があった");
    expect(markup).toContain("0 / 4");
  });
});
