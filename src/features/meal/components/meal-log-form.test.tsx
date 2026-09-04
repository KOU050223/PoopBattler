import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

import { MealLogForm } from "./meal-log-form";

describe("MealLogForm", () => {
  it("スキップが無いときは食事タブと同じ保存だけを出す", () => {
    const markup = renderToStaticMarkup(
      <MealLogForm onSave={async () => ({ success: false, message: "unused" })} />,
    );
    expect(markup).toContain("この食事を記録する");
    expect(markup).not.toContain("記録せずに完了する");
  });

  it("戦闘後は同じフォームにスキップを足す", () => {
    const markup = renderToStaticMarkup(
      <MealLogForm
        onSave={async () => ({ success: false, message: "unused" })}
        onSkip={() => undefined}
      />,
    );
    expect(markup).toContain("食事の写真");
    expect(markup).toContain("食品群・栄養観点");
    expect(markup).toContain("緑黄色野菜");
    expect(markup).toContain("記録せずに完了する");
  });

  it("保存と完了のあいだに今回のログを挟める", () => {
    const markup = renderToStaticMarkup(
      <MealLogForm
        onSave={async () => ({ success: false, message: "unused" })}
        onSkip={() => undefined}
        skipLabel="完了する"
      >
        <p>今回の食事</p>
      </MealLogForm>,
    );
    const saveIndex = markup.indexOf("この食事を記録する");
    const sessionIndex = markup.indexOf("今回の食事");
    const completeIndex = markup.indexOf("完了する");
    expect(saveIndex).toBeGreaterThan(-1);
    expect(sessionIndex).toBeGreaterThan(saveIndex);
    expect(completeIndex).toBeGreaterThan(sessionIndex);
  });
});
