import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { RENTAL_HP } from "@poopbattler/domain/battle/battle.constants";
import type { Database } from "@poopbattler/domain/types/database.types";

import {
  completeBattleAction,
  completeBattleForSession,
  loadOwnedCharacterIds,
  startBattleAction,
} from "./supabase-gateway";

type Result = { data?: unknown; error?: unknown; count?: number | null };

const BATTLE_ID = "11111111-1111-4111-8111-111111111111";
const OWNED_ID = "22222222-2222-4222-8222-222222222222";

// クエリビルダーの代役。チェーンは何を挟んでも自分を返し、await / maybeSingle で結果を返す。
function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) b[m] = () => b;
  b.maybeSingle = async () => ({ data: null, error: null, ...result });
  b.then = (resolve: (value: Result) => unknown) => resolve({ data: null, error: null, ...result });
  return b;
}

// tables は「テーブル名 → 呼ばれた順の結果」。呼び出し順そのものもテストの対象にする。
function fakeSupabase(opts: {
  user?: { id: string } | null;
  userError?: unknown;
  rpc?: Record<string, Result>;
  tables?: Record<string, Result[]>;
}) {
  const calls: string[] = [];
  const tables = Object.fromEntries(Object.entries(opts.tables ?? {}).map(([k, v]) => [k, [...v]]));
  const client = {
    auth: {
      getUser: vi.fn(async () => {
        calls.push("auth.getUser");
        return { data: { user: opts.user === undefined ? { id: "user-1" } : opts.user }, error: opts.userError ?? null };
      }),
    },
    rpc: vi.fn(async (name: string, args: unknown) => {
      calls.push(`rpc:${name}`);
      void args;
      return { data: null, error: null, ...opts.rpc?.[name] };
    }),
    from: vi.fn((table: string) => {
      calls.push(`from:${table}`);
      return builder(tables[table]?.shift() ?? {});
    }),
  };
  return { client: client as unknown as SupabaseClient<Database>, raw: client, calls };
}

const enemy = { id: "curry-poop", name: "カレー", attribute: "curry", rarity: "common", image_key: null };
const normal = { id: "normal-poop", name: "ふつう", attribute: "normal", rarity: "common", image_key: null };
const ownedMember = (id: string) => ({
  user_character_id: id,
  character_id: "meat-poop",
  attribute: "meat",
  name: "にく",
  hp: 300,
  power: 25,
  speed: 22,
});
const rpcRow = (party: unknown[]) => ({
  battle_id: BATTLE_ID,
  enemy_character_id: "curry-poop",
  enemy_attribute: "curry",
  enemy_hp: 480,
  enemy_power: 26,
  enemy_speed: 20,
  party_snapshot: party,
  resumed: false,
});

describe("startBattleAction", () => {
  it("RPC 成功: 所持3体 + 敵をマスターから引いて started を返す", async () => {
    const party = [ownedMember("a"), ownedMember("b"), ownedMember("c")];
    const { client, raw, calls } = fakeSupabase({
      rpc: { start_battle: { data: [rpcRow(party)] } },
      tables: { user_characters: [{ data: [{ id: "a" }, { id: "b" }, { id: "c" }] }], characters: [{ data: enemy }] },
    });

    const result = await startBattleAction(client, {});

    expect(result.status).toBe("started");
    if (result.status !== "started") return;
    expect(result.battleId).toBe(BATTLE_ID);
    expect(result.enemy.characterId).toBe("curry-poop");
    expect(result.enemyHp).toBe(480);
    expect(result.party.map((m) => m.hp)).toEqual([300, 300, 300]);
    expect(result.party.every((m) => m.userCharacterId !== null)).toBe(true);
    // 順序: ユーザー確認 → 所持個体 → RPC → 敵マスター（レンタル不要なので characters は1回だけ）
    expect(calls).toEqual(["auth.getUser", "from:user_characters", "rpc:start_battle", "from:characters"]);
    expect(raw.rpc).toHaveBeenCalledWith("start_battle", { p_user_character_ids: ["a", "b", "c"] });
  });

  it("選出IDがあれば所持個体の検索を省略し、そのIDを RPC に渡す", async () => {
    const { client, raw, calls } = fakeSupabase({
      rpc: { start_battle: { data: [rpcRow([ownedMember(OWNED_ID), ownedMember("b"), ownedMember("c")])] } },
      tables: { characters: [{ data: enemy }] },
    });

    await startBattleAction(client, { userCharacterIds: [OWNED_ID, "not-a-uuid"] });

    expect(calls).not.toContain("from:user_characters");
    expect(raw.rpc).toHaveBeenCalledWith("start_battle", { p_user_character_ids: [OWNED_ID] });
  });

  it("レンタル穴埋め: 所持1体なら残り2枠を normal 属性のレンタルで埋める", async () => {
    const { client, calls } = fakeSupabase({
      rpc: { start_battle: { data: [rpcRow([ownedMember(OWNED_ID)])] } },
      tables: { characters: [{ data: enemy }, { data: [normal] }] },
    });

    const result = await startBattleAction(client, { userCharacterIds: [OWNED_ID] });

    expect(result.status).toBe("started");
    if (result.status !== "started") return;
    expect(result.party[0].userCharacterId).toBe(OWNED_ID);
    expect(result.party.slice(1).map((m) => [m.userCharacterId, m.characterId, m.hp])).toEqual([
      [null, "normal-poop", RENTAL_HP],
      [null, "normal-poop", RENTAL_HP],
    ]);
    expect(calls.filter((c) => c === "from:characters")).toHaveLength(2);
  });

  it("レンタル候補が取れなくても、敵キャラで3枠を埋めて開始できる（web と同じ最終手段）", async () => {
    const { client } = fakeSupabase({
      rpc: { start_battle: { data: [rpcRow([])] } },
      tables: { user_characters: [{ data: [] }], characters: [{ data: enemy }, { error: { message: "x" } }] },
    });

    const result = await startBattleAction(client, {});

    expect(result.status).toBe("started");
    if (result.status !== "started") return;
    expect(result.party.map((m) => m.characterId)).toEqual(["curry-poop", "curry-poop", "curry-poop"]);
  });

  it("未ログインは RPC を呼ばずエラー", async () => {
    const { client, raw } = fakeSupabase({ user: null });
    const result = await startBattleAction(client, {});
    expect(result).toEqual({ status: "error", message: expect.stringContaining("準備ができていません") });
    expect(raw.rpc).not.toHaveBeenCalled();
  });

  it("所持個体の読み出し失敗は開始せずエラー（空パーティでバトルを作らない）", async () => {
    const { client, raw } = fakeSupabase({ tables: { user_characters: [{ error: { message: "x" } }] } });
    const result = await startBattleAction(client, {});
    expect(result.status).toBe("error");
    expect(raw.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["RPC エラー", { error: { message: "boom" } }],
    ["行なし", { data: [] }],
    ["party_snapshot の形が不正", { data: [rpcRow([{ character_id: 1 }])] }],
    ["enemy_hp が数値でない", { data: [{ ...rpcRow([]), enemy_hp: "480" }] }],
  ])("start_battle の失敗の写像: %s", async (_name, rpc) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeSupabase({ rpc: { start_battle: rpc }, tables: { user_characters: [{ data: [] }] } });
    expect(await startBattleAction(client, {})).toEqual({
      status: "error",
      message: expect.stringContaining("開始できませんでした"),
    });
  });

  it("敵キャラがマスターに無ければエラー", async () => {
    const { client } = fakeSupabase({
      rpc: { start_battle: { data: [rpcRow([ownedMember("a"), ownedMember("b"), ownedMember("c")])] } },
      tables: { user_characters: [{ data: [] }], characters: [{ data: null }] },
    });
    expect((await startBattleAction(client, {})).status).toBe("error");
  });
});

const bowelLog = { hardness: 4, amount: "normal", color: "brown", ease: "easy" } as const;
const completeRow = (over: Record<string, unknown> = {}) => ({
  battle_id: BATTLE_ID,
  status: "completed",
  companionship_result: false,
  character_id: null,
  ...over,
});

describe("completeBattleAction", () => {
  it("成功: RPC → 完了行 → 完了件数 → 食事件数 の順で読み戻す", async () => {
    const { client, raw, calls } = fakeSupabase({
      rpc: { complete_battle_with_symptoms: { data: [completeRow()] } },
      tables: {
        battle_results: [{ data: { completed_at: "2026-10-07T00:00:00Z", meal_log_id: null } }, { count: 1 }],
        meal_logs: [{ count: 2 }],
      },
    });

    const result = await completeBattleAction(client, { battleId: BATTLE_ID, bowelLog });

    expect(result).toEqual({
      success: true,
      battleId: BATTLE_ID,
      companionshipResult: false,
      acquiredCharacter: null,
      completedAt: "2026-10-07T00:00:00Z",
      usedMealLog: true,
      isFirstCompletedBattle: true,
    });
    expect(calls).toEqual([
      "auth.getUser",
      "rpc:complete_battle_with_symptoms",
      "from:battle_results",
      "from:battle_results",
      "from:meal_logs",
    ]);
    expect(raw.rpc).toHaveBeenCalledWith("complete_battle_with_symptoms", {
      p_battle_id: BATTLE_ID,
      p_hardness: 4,
      p_amount: "normal",
      p_color: "brown",
      p_ease: "easy",
      p_symptoms: [],
    });
  });

  it("仲間化: character_id があればマスターから読んで返す。2回目以降の完了は初回扱いにしない", async () => {
    const acquired = { id: "meat-poop", name: "にく", attribute: "meat", rarity: "rare" };
    const { client } = fakeSupabase({
      rpc: { complete_battle_with_symptoms: { data: [completeRow({ companionship_result: true, character_id: "meat-poop" })] } },
      tables: {
        battle_results: [{ data: { completed_at: "t", meal_log_id: null } }, { count: 3 }],
        meal_logs: [{ count: 0 }],
        characters: [{ data: acquired }],
      },
    });

    const result = await completeBattleAction(client, { battleId: BATTLE_ID, bowelLog });

    expect(result).toMatchObject({ success: true, acquiredCharacter: acquired, usedMealLog: false, isFirstCompletedBattle: false });
  });

  it("入力が不正なら通信せずエラー", async () => {
    const { client, raw } = fakeSupabase({});
    const result = await completeBattleAction(client, { battleId: "nope", bowelLog });
    expect(result).toEqual({ success: false, message: "入力内容を確認してください。" });
    expect(raw.auth.getUser).not.toHaveBeenCalled();
  });

  it("未ログインは RPC を呼ばない", async () => {
    const { client, raw } = fakeSupabase({ user: null });
    const result = await completeBattleAction(client, { battleId: BATTLE_ID, bowelLog });
    expect(result.success).toBe(false);
    expect(raw.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501 は終了済み扱い", { code: "42501", message: "x" }, "もう進められません"],
    ["不正な排便入力", { message: "invalid bowel log" }, "排便の入力内容"],
    ["その他", { message: "boom" }, "完了に失敗しました"],
  ])("RPC エラーの写像: %s", async (_name, error, text) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeSupabase({ rpc: { complete_battle_with_symptoms: { error } } });
    const result = await completeBattleAction(client, { battleId: BATTLE_ID, bowelLog });
    expect(result).toEqual({ success: false, message: expect.stringContaining(text) });
  });

  it.each([
    ["status が completed でない", completeRow({ status: "won" })],
    ["別バトルの行", completeRow({ battle_id: "other" })],
    ["仲間化フラグと character_id が食い違う", completeRow({ companionship_result: true, character_id: null })],
  ])("RPC の戻り値が不整合: %s", async (_name, row) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeSupabase({ rpc: { complete_battle_with_symptoms: { data: [row] } } });
    const result = await completeBattleAction(client, { battleId: BATTLE_ID, bowelLog });
    expect(result.success).toBe(false);
  });

  it("完了行の読み戻しに失敗したらエラー", async () => {
    const { client } = fakeSupabase({
      rpc: { complete_battle_with_symptoms: { data: [completeRow()] } },
      tables: { battle_results: [{ data: null }] },
    });
    expect(await completeBattleAction(client, { battleId: BATTLE_ID, bowelLog })).toEqual({
      success: false,
      message: expect.stringContaining("取得に失敗"),
    });
  });

  it("症状があれば p_symptoms に乗せる", async () => {
    const { client, raw } = fakeSupabase({
      rpc: { complete_battle_with_symptoms: { data: [completeRow()] } },
      tables: {
        battle_results: [{ data: { completed_at: "t", meal_log_id: null } }, { count: 1 }],
        meal_logs: [{ count: 0 }],
      },
    });

    await completeBattleAction(client, {
      battleId: BATTLE_ID,
      bowelLog: { ...bowelLog, symptoms: ["strained", "abdominal_pain"] },
    });

    expect(raw.rpc).toHaveBeenCalledWith("complete_battle_with_symptoms",
      expect.objectContaining({ p_symptoms: ["strained", "abdominal_pain"] }));
  });
});

const MEAL_1 = "33333333-3333-4333-8333-333333333333";
const MEAL_2 = "44444444-4444-4444-8444-444444444444";
const completedTables = {
  battle_results: [{ data: { completed_at: "t", meal_log_id: null } }, { count: 1 }],
  meal_logs: [{ count: 1 }],
};

describe("completeBattleForSession", () => {
  it("食事セッションで記録した最後のログIDを p_meal_log_id として送る", async () => {
    const { client, raw } = fakeSupabase({
      rpc: { complete_battle_with_symptoms: { data: [completeRow()] } },
      tables: completedTables,
    });

    const result = await completeBattleForSession(client, {
      battleId: BATTLE_ID,
      bowelLog,
      sessionMealLogIds: [MEAL_1, MEAL_2],
    });

    expect(result.success).toBe(true);
    expect(raw.rpc).toHaveBeenCalledWith("complete_battle_with_symptoms",
      expect.objectContaining({ p_meal_log_id: MEAL_2 }));
  });

  it("未記録で完了したら p_meal_log_id を送らない", async () => {
    const { client, raw } = fakeSupabase({
      rpc: { complete_battle_with_symptoms: { data: [completeRow()] } },
      tables: completedTables,
    });

    const result = await completeBattleForSession(client, {
      battleId: BATTLE_ID,
      bowelLog,
      sessionMealLogIds: [],
    });

    expect(result.success).toBe(true);
    const args = raw.rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args).not.toHaveProperty("p_meal_log_id");
  });
});

describe("loadOwnedCharacterIds", () => {
  it("所持個体のidを新しい順に全件返す（3件制限なし）", async () => {
    const { client, calls } = fakeSupabase({
      tables: { user_characters: [{ data: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }] }] },
    });

    expect(await loadOwnedCharacterIds(client)).toEqual(["a", "b", "c", "d"]);
    expect(calls).toEqual(["from:user_characters"]);
  });

  it("読み込み失敗は throw（呼び出し側で編成フォールバックに分岐する）", async () => {
    const { client } = fakeSupabase({ tables: { user_characters: [{ error: { message: "x" } }] } });
    await expect(loadOwnedCharacterIds(client)).rejects.toThrow();
  });
});
