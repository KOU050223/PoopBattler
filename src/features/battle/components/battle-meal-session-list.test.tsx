import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/meal/components/meal-log-image", () => ({
  MealLogImage: ({ photoId }: { photoId: string }) => <span data-photo={photoId}>photo</span>,
}));

import { BattleMealSessionList } from "./battle-meal-session-list";
import type { MealLog } from "@/features/meal/actions";

const curryLog: MealLog = {
  id: "00000000-0000-4000-8000-000000000011",
  eatenAt: "2026-09-04T03:00:00.000Z",
  photoId: "00000000-0000-4000-8000-000000000021",
  foodGroups: ["rice", "spicy_food"],
  note: "昼のカレー",
};

const bananaLog: MealLog = {
  id: "00000000-0000-4000-8000-000000000012",
  eatenAt: "2026-09-04T04:00:00.000Z",
  photoId: "00000000-0000-4000-8000-000000000022",
  foodGroups: ["fruit"],
  note: null,
};

describe("BattleMealSessionList", () => {
  it("未記録ならリスト自体を出さない", () => {
    expect(renderToStaticMarkup(<BattleMealSessionList logs={[]} />)).toBe("");
  });

  it("この回の記録が下に溜まり、完了前でも次の写真を足せる", () => {
    const markup = renderToStaticMarkup(
      <BattleMealSessionList logs={[curryLog, bananaLog]} />,
    );
    expect(markup).toContain("今回の食事");
    expect(markup).toContain("2件");
    expect(markup).toContain("ごはん");
    expect(markup).toContain("果物");
    expect(markup).toContain("昼のカレー");
    expect(markup).not.toContain("削除");
  });
});
