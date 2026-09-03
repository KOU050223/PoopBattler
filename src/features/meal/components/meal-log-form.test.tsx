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
    expect(markup).toContain("保存内容を確認する");
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
    expect(markup).toContain("食事タグ");
    expect(markup).toContain("記録せずに完了する");
    expect(markup).not.toContain("仲間になる確率");
  });

  it("複数枚のときは仲間化確率の説明を出す", () => {
    const markup = renderToStaticMarkup(
      <MealLogForm
        maxPhotos={4}
        photoCountHint={(photoCount) =>
          photoCount === 0 ? "写真がないと仲間になりません。" : `写真${photoCount}枚`
        }
        onSave={async () => ({ success: false, message: "unused" })}
        onSkip={() => undefined}
      />,
    );
    expect(markup).toContain("写真がないと仲間になりません。");
    expect(markup).toContain("ファイルを選択する");
  });
});
