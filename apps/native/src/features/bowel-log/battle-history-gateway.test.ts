import { describe, expect, it } from "vitest";

import { mockSupabase } from "../test-support";
import { createBattleHistoryGateway } from "./battle-history-gateway";

const enemy = { id: "c1", name: "カレーン", attribute: "curry" };
const base = { id: "b1", started_at: "2026-10-01T00:00:00Z", completed_at: "2026-10-01T00:05:00Z", companionship_result: true, meal_logs: { food_groups: ["rice"] }, characters: enemy };

describe("getBattleHistory", () => {
  it("embedded select を domain 形へ写す", async () => {
    const bowel = { hardness: 4, amount: "normal", color: "brown", ease: "easy", symptoms: null };
    const { client, calls } = mockSupabase({ result: { data: [{ ...base, bowel_logs: bowel }], error: null } });
    const [log] = await createBattleHistoryGateway(client).getBattleHistory();
    expect(log).toEqual({
      battleId: "b1", completedAt: base.completed_at, companionshipResult: true, mealFoodGroups: ["rice"],
      enemy, bowelLog: { hardness: 4, amount: "normal", color: "brown", ease: "easy", symptoms: [] },
    });
    expect(calls[0].ops).toContainEqual(["eq", ["status", "completed"]]);
  });

  it("null の関連は null/フォールバックにし、敵が無い行は捨てる", async () => {
    const rows = [
      { ...base, completed_at: null, companionship_result: null, meal_logs: null, bowel_logs: null },
      { ...base, id: "b2", characters: null, bowel_logs: null },
    ];
    const logs = await createBattleHistoryGateway(mockSupabase({ result: { data: rows, error: null } }).client).getBattleHistory();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ completedAt: base.started_at, companionshipResult: false, mealFoodGroups: null, bowelLog: null });
  });

  it("未ログインは空、RLS/DBエラーは throw", async () => {
    expect(await createBattleHistoryGateway(mockSupabase({ user: null }).client).getBattleHistory()).toEqual([]);
    const { client } = mockSupabase({ result: { data: null, error: { message: "denied" } } });
    await expect(createBattleHistoryGateway(client).getBattleHistory()).rejects.toThrow("履歴の読み込みに失敗しました。");
  });
});
