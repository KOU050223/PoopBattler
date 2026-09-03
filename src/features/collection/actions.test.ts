import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { getCollectionCharactersAction } from "./actions";

const user = { id: "00000000-0000-4000-8000-000000000001" };

function createSupabase({
  userData = user,
  queryError = null,
  rows = [],
}: {
  userData?: typeof user | null;
  queryError?: { message: string } | null;
  rows?: Array<{
    id: string;
    acquired_at: string;
    characters: { id: string; name: string; attribute: "curry"; rarity: "rare" } | null;
  }>;
} = {}) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: queryError });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userData }, error: null }) },
    from: vi.fn().mockReturnValue({ select }),
    select,
    eq,
    order,
  };
}

describe("getCollectionCharactersAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("本人の取得キャラクターを取得日時の新しい順で返す", async () => {
    const rows = [{
      id: "00000000-0000-4000-8000-000000000002",
      acquired_at: "2026-09-03T07:00:00.000Z",
      characters: { id: "spicy-poop", name: "激辛うんちくん", attribute: "curry" as const, rarity: "rare" as const },
    }];
    const supabase = createSupabase({ rows });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getCollectionCharactersAction()).resolves.toEqual([{
      ownershipId: rows[0].id,
      acquiredAt: rows[0].acquired_at,
      ...rows[0].characters,
    }]);
    expect(supabase.select).toHaveBeenCalledWith("id, acquired_at, characters!user_characters_character_id_fkey(id, name, attribute, rarity)");
    expect(supabase.eq).toHaveBeenCalledWith("user_id", user.id);
    expect(supabase.order).toHaveBeenCalledWith("acquired_at", { ascending: false });
  });

  it("未認証時は他人のデータを問い合わせず空配列を返す", async () => {
    const supabase = createSupabase({ userData: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getCollectionCharactersAction()).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("読取失敗を成功扱いにせず、画面の再試行UIへ渡す", async () => {
    const supabase = createSupabase({ queryError: { message: "RLS denied" } });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getCollectionCharactersAction()).rejects.toThrow("取得キャラクターの読み込みに失敗しました。");
  });
});
