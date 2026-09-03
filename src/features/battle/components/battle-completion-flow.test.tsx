import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

vi.mock("@/features/meal/actions", () => ({
  getMealLogsAction: async () => [],
  saveMealLogAction: async () => ({ success: false, message: "unused" }),
}));

vi.mock("@/features/meal/hooks/use-meal-camera", () => ({
  useMealCamera: () => ({
    stream: null,
    status: "idle",
    start: async () => undefined,
    stop: () => undefined,
  }),
}));

import { BattleCompletionFlow, BattleMealStep } from "./battle-completion-flow";
import type { MealLog } from "@/features/meal/actions";

describe("BattleCompletionFlow", () => {
  it("うんち記録の前は食事画面を出さない", () => {
    const markup = renderToStaticMarkup(
      <BattleCompletionFlow
        battleId="00000000-0000-4000-8000-000000000001"
        onCompleted={() => undefined}
        onAbandon={() => undefined}
      />,
    );
    expect(markup).toContain("勝利！");
    expect(markup).toContain("硬さ");
    expect(markup).not.toContain("この食事を記録する");
    expect(markup).not.toContain("今回の食事");
  });

  it("1枚目を送ったあとも同じ画面に止まり、次の写真と完了が残る", () => {
    const sessionLogs: MealLog[] = [
      {
        id: "00000000-0000-4000-8000-000000000011",
        eatenAt: "2026-09-04T03:00:00.000Z",
        photoId: "00000000-0000-4000-8000-000000000021",
        tag: "curry",
        note: null,
      },
    ];
    const markup = renderToStaticMarkup(
      <BattleMealStep
        existingMealLogCount={0}
        sessionLogs={sessionLogs}
        error={null}
        onSave={async () => ({ success: false, message: "unused" })}
        onComplete={() => undefined}
        onAbandon={() => undefined}
      />,
    );
    expect(markup).toContain("食事の記録");
    expect(markup).toContain("この食事を記録する");
    expect(markup).toContain("今回の食事");
    expect(markup).toContain("カレー");
    expect(markup).toContain("完了する");
    expect(markup).not.toContain("記録せずに完了する");
  });

  it("うんちの次の食事画面は、写真を選ぶボタンから始める", () => {
    const markup = renderToStaticMarkup(
      <BattleMealStep
        existingMealLogCount={0}
        sessionLogs={[]}
        error={null}
        onSave={async () => ({ success: false, message: "unused" })}
        onComplete={() => undefined}
        onAbandon={() => undefined}
      />,
    );
    expect(markup).toContain("食事の記録");
    expect(markup).toContain("写真を選ぶ");
    expect(markup).toContain("カメラで撮る");
  });
});
