import { describe, expect, it, vi } from "vitest";

// 変換部分だけを試す。gateway は supabase の env を要求するのでモックする。
vi.mock("expo-router", () => ({ useFocusEffect: () => {} }));
vi.mock("@/gateways", () => ({ battleHistoryGateway: () => ({}) }));

import type { BattleHistoryLog } from "@/features/bowel-log/battle-history-gateway";
import { toLoggedAtList } from "./use-streak";

const battle = (completedAt: string, hasBowelLog: boolean): BattleHistoryLog => ({
  battleId: completedAt,
  completedAt,
  companionshipResult: false,
  mealFoodGroups: null,
  enemy: { id: "e", name: "e", attribute: "normal" } as BattleHistoryLog["enemy"],
  bowelLog: hasBowelLog
    ? { hardness: 4, amount: "normal", color: "brown", ease: "normal", symptoms: [] } as unknown as BattleHistoryLog["bowelLog"]
    : null,
});

describe("toLoggedAtList", () => {
  it("履歴が空なら空配列", () => {
    expect(toLoggedAtList([])).toEqual([]);
  });

  it("bowelLog があるバトルの completedAt だけを取り出す", () => {
    const history = [battle("2026-10-29T08:00:00Z", true), battle("2026-10-28T08:00:00Z", false), battle("2026-10-27T08:00:00Z", true)];
    expect(toLoggedAtList(history)).toEqual(["2026-10-29T08:00:00Z", "2026-10-27T08:00:00Z"]);
  });

  it("bowelLog が1件も無ければ空配列", () => {
    expect(toLoggedAtList([battle("2026-10-29T08:00:00Z", false)])).toEqual([]);
  });
});
