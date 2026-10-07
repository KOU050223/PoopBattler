import { describe, expect, it } from "vitest";

import { mockSupabase } from "../test-support";
import { createCollectionGateway } from "./collection-gateway";

describe("getCollectionCharacters", () => {
  it("所持行とキャラを平らに写し、キャラが無い行は捨てる", async () => {
    const rows = [
      { id: "o1", acquired_at: "2026-10-01T00:00:00Z", hp: 10, power: 5, speed: 3, characters: { id: "c1", name: "カレーン", attribute: "curry", rarity: "rare" } },
      { id: "o2", acquired_at: "2026-09-01T00:00:00Z", hp: 1, power: 1, speed: 1, characters: null },
    ];
    const { client, calls } = mockSupabase({ result: { data: rows, error: null } });
    expect(await createCollectionGateway(client).getCollectionCharacters()).toEqual([
      { ownershipId: "o1", acquiredAt: "2026-10-01T00:00:00Z", hp: 10, power: 5, speed: 3, id: "c1", name: "カレーン", attribute: "curry", rarity: "rare" },
    ]);
    expect(calls[0].ops).toContainEqual(["eq", ["user_id", "user-1"]]);
  });

  it("未ログインは空、DBエラーは throw", async () => {
    expect(await createCollectionGateway(mockSupabase({ user: null }).client).getCollectionCharacters()).toEqual([]);
    const { client } = mockSupabase({ result: { data: null, error: { message: "rls" } } });
    await expect(createCollectionGateway(client).getCollectionCharacters()).rejects.toThrow("取得キャラクターの読み込みに失敗しました。");
  });
});
