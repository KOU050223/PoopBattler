import { describe, expect, it } from "vitest";

import { mockSupabase } from "../test-support";
import { createMealGateway } from "./meal-gateway";

const PHOTO = "11111111-1111-4111-8111-111111111111";
const LOG = "22222222-2222-4222-8222-222222222222";
const draft = { photoId: PHOTO, eatenAt: "2026-10-07T03:00:00.000Z", foodGroups: ["rice" as const], note: "うまい" };

describe("saveMealLog", () => {
  it("成功時は現行と同じ列だけ insert し、id を返す", async () => {
    const { client, calls } = mockSupabase({ result: { data: { id: LOG }, error: null } });
    expect(await createMealGateway(client).saveMealLog(draft)).toEqual({ success: true, mealLogId: LOG });
    expect(calls[0].ops[0]).toEqual(["insert", [{
      user_id: "user-1", eaten_at: draft.eatenAt, image_path: PHOTO, food_groups: ["rice"], note: "うまい",
    }]]);
  });

  it("RLS拒否（error）は保存失敗メッセージに写す", async () => {
    const { client } = mockSupabase({ result: { data: null, error: { message: "new row violates row-level security policy" } } });
    expect(await createMealGateway(client).saveMealLog(draft)).toEqual({
      success: false, message: "食事ログの保存に失敗しました。もう一度お試しください。",
    });
  });

  it("data が null でも失敗扱い", async () => {
    const { client } = mockSupabase({ result: { data: null, error: null } });
    expect((await createMealGateway(client).saveMealLog(draft)).success).toBe(false);
  });

  it("未ログインなら DB に触らず失敗", async () => {
    const { client, calls } = mockSupabase({ user: null });
    expect(await createMealGateway(client).saveMealLog(draft)).toEqual({
      success: false, message: "ログイン状態を確認できませんでした。もう一度お試しください。",
    });
    expect(calls).toHaveLength(0);
  });

  it("不正な入力は DB に触らず弾く", async () => {
    const { client, calls } = mockSupabase({});
    const result = await createMealGateway(client).saveMealLog({ ...draft, foodGroups: [] });
    expect(result).toEqual({ success: false, message: "入力内容を確認してください。" });
    expect(calls).toHaveLength(0);
  });
});

describe("getMealLogs", () => {
  it("行を camelCase に写し、新しい順で本人分だけ取得する", async () => {
    const row = { id: LOG, eaten_at: draft.eatenAt, image_path: PHOTO, food_groups: ["rice"], note: null };
    const { client, calls } = mockSupabase({ result: { data: [row], error: null } });
    expect(await createMealGateway(client).getMealLogs()).toEqual([
      { id: LOG, eatenAt: draft.eatenAt, photoId: PHOTO, foodGroups: ["rice"], note: null },
    ]);
    expect(calls[0].ops).toContainEqual(["eq", ["user_id", "user-1"]]);
    expect(calls[0].ops).toContainEqual(["order", ["eaten_at", { ascending: false }]]);
  });

  it("未ログインは空配列、DBエラーは throw", async () => {
    expect(await createMealGateway(mockSupabase({ user: null }).client).getMealLogs()).toEqual([]);
    const { client } = mockSupabase({ result: { data: null, error: { message: "denied" } } });
    await expect(createMealGateway(client).getMealLogs()).rejects.toThrow("食事ログの取得に失敗しました。");
  });
});

describe("replaceMealLogPhoto", () => {
  it("旧 image_path を返す", async () => {
    const { client, calls } = mockSupabase({ result: { data: { image_path: PHOTO }, error: null } });
    const next = "33333333-3333-4333-8333-333333333333";
    expect(await createMealGateway(client).replaceMealLogPhoto(LOG, next)).toBe(PHOTO);
    expect(calls[1].ops[0]).toEqual(["update", [{ image_path: next }]]);
  });

  it("対象行が見えない（RLS/null）なら失敗、不正IDは入力エラー", async () => {
    const { client } = mockSupabase({ result: { data: null, error: null } });
    await expect(createMealGateway(client).replaceMealLogPhoto(LOG, PHOTO)).rejects.toThrow("食事写真の差し替えに失敗しました。");
    await expect(createMealGateway(client).replaceMealLogPhoto("x", PHOTO)).rejects.toThrow("入力内容が不正です。");
  });
});

describe("deleteMealLog", () => {
  it("削除した行の image_path を返す", async () => {
    const { client } = mockSupabase({ result: { data: { image_path: PHOTO }, error: null } });
    expect(await createMealGateway(client).deleteMealLog(LOG)).toBe(PHOTO);
  });

  it("RLS拒否・null は失敗", async () => {
    await expect(createMealGateway(mockSupabase({ result: { data: null, error: null } }).client).deleteMealLog(LOG))
      .rejects.toThrow("食事ログの削除に失敗しました。");
    await expect(createMealGateway(mockSupabase({ result: { data: null, error: { message: "rls" } } }).client).deleteMealLog(LOG))
      .rejects.toThrow("食事ログの削除に失敗しました。");
  });
});
