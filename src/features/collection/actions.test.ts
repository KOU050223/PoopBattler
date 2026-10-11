import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  evolveCharacterAction,
  getCollectionCharactersAction,
  mergeCharactersAction,
} from "./actions";

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
    hp: number;
    power: number;
    speed: number;
    tier: number;
    rank: number;
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
      hp: 252,
      power: 21,
      speed: 18,
      tier: 0,
      rank: 0,
      characters: { id: "spicy-poop", name: "激辛うんちくん", attribute: "curry" as const, rarity: "rare" as const },
    }];
    const supabase = createSupabase({ rows });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getCollectionCharactersAction()).resolves.toEqual([{
      ownershipId: rows[0].id,
      acquiredAt: rows[0].acquired_at,
      tier: 0,
      rank: 0,
      baseStats: { hp: 252, power: 21, speed: 18 },
      hp: 252,
      power: 21,
      speed: 18,
      ...rows[0].characters,
    }]);
    expect(supabase.select).toHaveBeenCalledWith("id, acquired_at, hp, power, speed, tier, rank, characters!user_characters_character_id_fkey(id, name, attribute, rarity)");
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

describe("getCollectionCharactersAction の育成", () => {
  beforeEach(() => vi.clearAllMocks());

  it("★と凸を掛けた実効値を返し、個体値は別に残す", async () => {
    const supabase = createSupabase({
      rows: [{
        id: "00000000-0000-4000-8000-000000000003",
        acquired_at: "2026-09-03T07:00:00.000Z",
        hp: 240,
        power: 20,
        speed: 20,
        tier: 1,
        rank: 1,
        characters: { id: "spicy-poop", name: "激辛うんちくん", attribute: "curry" as const, rarity: "rare" as const },
      }],
    });
    mocks.createClient.mockResolvedValue(supabase);

    // rare は1段7%。★2・1凸 = 進行度5 → ×1.35。
    await expect(getCollectionCharactersAction()).resolves.toMatchObject([{
      tier: 1,
      rank: 1,
      baseStats: { hp: 240, power: 20, speed: 20 },
      hp: 324,
      power: 27,
      speed: 27,
    }]);
  });
});

function createRpcSupabase(error: { code: string } | null) {
  return { rpc: vi.fn().mockResolvedValue({ data: error ? null : [{}], error }) };
}

describe("mergeCharactersAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("確認フラグをそのまま RPC へ渡し、成功したら図鑑を更新する", async () => {
    const supabase = createRpcSupabase(null);
    mocks.createClient.mockResolvedValue(supabase);

    await expect(mergeCharactersAction("base", "material", true)).resolves.toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalledWith("merge_characters", {
      p_base_id: "base",
      p_material_id: "material",
      p_confirm_enhanced: true,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/collection");
  });

  it("拒否されたら理由ごとの文言を返し、図鑑は更新しない", async () => {
    mocks.createClient.mockResolvedValue(createRpcSupabase({ code: "PBM01" }));
    await expect(mergeCharactersAction("base", "material", false)).resolves.toEqual({
      ok: false,
      message: "育てた仲間を素材にするには、確認が必要です。もう一度選び直してください。",
    });

    mocks.createClient.mockResolvedValue(createRpcSupabase({ code: "PBM03" }));
    await expect(mergeCharactersAction("base", "material", false)).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("バトル中"),
    });

    mocks.createClient.mockResolvedValue(createRpcSupabase({ code: "XX000" }));
    await expect(mergeCharactersAction("base", "material", false)).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("もう一度試して"),
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("evolveCharacterAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("成功したら図鑑を更新する", async () => {
    const supabase = createRpcSupabase(null);
    mocks.createClient.mockResolvedValue(supabase);

    await expect(evolveCharacterAction("own-1")).resolves.toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalledWith("evolve_character", { p_user_character_id: "own-1" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/collection");
  });

  it("4凸未満なら進化できない理由を返す", async () => {
    mocks.createClient.mockResolvedValue(createRpcSupabase({ code: "PBM04" }));

    await expect(evolveCharacterAction("own-1")).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("4凸"),
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
