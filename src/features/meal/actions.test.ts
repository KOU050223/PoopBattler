import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { getMealLogsAction, saveMealLogAction } from "./actions";

const user = { id: "00000000-0000-4000-8000-000000000001" };
const photoId = "00000000-0000-4000-8000-000000000002";

const mealLogId = "00000000-0000-4000-8000-000000000009";

function createSupabase({ userData = user, insertError = null, insertedId = mealLogId }: {
  userData?: typeof user | null;
  insertError?: { message: string } | null;
  insertedId?: string | null;
} = {}) {
  const single = vi.fn().mockResolvedValue({
    data: insertError ? null : insertedId ? { id: insertedId } : null,
    error: insertError,
  });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userData }, error: null }) },
    from: vi.fn().mockReturnValue({ insert }),
    insert,
    select,
    single,
  };
}

function createReadSupabase({
  userData = user,
  queryError = null,
  mealLogs = [],
}: {
  userData?: typeof user | null;
  queryError?: { message: string } | null;
  mealLogs?: Array<{ id: string; eaten_at: string; image_path: string; tag: string; note: string | null }>;
} = {}) {
  const order = vi.fn().mockResolvedValue({ data: mealLogs, error: queryError });
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

function createDraft(overrides: Partial<Parameters<typeof saveMealLogAction>[0]> = {}) {
  return {
    photoId,
    eatenAt: "2026-09-02T12:34:56.000Z",
    tag: "curry" as const,
    note: "昼ごはん",
    ...overrides,
  };
}

describe("saveMealLogAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("認証済み本人のIDと画像IDだけで食事ログを作成する", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(saveMealLogAction(createDraft())).resolves.toEqual({
      success: true,
      mealLogId,
    });
    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: user.id,
      eaten_at: "2026-09-02T12:34:56.000Z",
      image_path: photoId,
      tag: "curry",
      note: "昼ごはん",
    });
    expect(supabase.select).toHaveBeenCalledWith("id");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/meals");
  });

  it("不正な画像ID・タグ・日時・長すぎるメモをDBへ送らない", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    for (const draft of [
      createDraft({ photoId: "not-a-uuid" }),
      createDraft({ tag: "invalid" as "curry" }),
      createDraft({ eatenAt: "2026-09-02" }),
      createDraft({ note: "a".repeat(501) }),
    ]) {
      await expect(saveMealLogAction(draft)).resolves.toEqual({ success: false, message: "入力内容を確認してください。" });
    }
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it("未認証とDB失敗を利用者向けの失敗結果へ変換し、成功として返さない", async () => {
    const unauthenticated = createSupabase({ userData: null });
    mocks.createClient.mockResolvedValueOnce(unauthenticated);
    await expect(saveMealLogAction(createDraft())).resolves.toEqual({
      success: false,
      message: "ログイン状態を確認できませんでした。もう一度お試しください。",
    });

    const failedInsert = createSupabase({ insertError: { message: "RLS denied" } });
    mocks.createClient.mockResolvedValueOnce(failedInsert);
    await expect(saveMealLogAction(createDraft())).resolves.toEqual({
      success: false,
      message: "食事ログの保存に失敗しました。もう一度お試しください。",
    });

    const missingId = createSupabase({ insertedId: null });
    mocks.createClient.mockResolvedValueOnce(missingId);
    await expect(saveMealLogAction(createDraft())).resolves.toEqual({
      success: false,
      message: "食事ログの保存に失敗しました。もう一度お試しください。",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("getMealLogsAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("本人の食事ログを新しい順で取得し、画像IDをURLに変換せず返す", async () => {
    const mealLogs = [
      { id: "00000000-0000-4000-8000-000000000003", eaten_at: "2026-09-02T12:34:56.000Z", image_path: photoId, tag: "banana", note: null },
    ];
    const supabase = createReadSupabase({ mealLogs });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getMealLogsAction()).resolves.toEqual([{
      id: mealLogs[0].id,
      eatenAt: mealLogs[0].eaten_at,
      photoId,
      tag: "banana",
      note: null,
    }]);
    expect(supabase.select).toHaveBeenCalledWith("id, eaten_at, image_path, tag, note");
    expect(supabase.eq).toHaveBeenCalledWith("user_id", user.id);
    expect(supabase.order).toHaveBeenCalledWith("eaten_at", { ascending: false });
  });

  it("未認証時はDBへ問い合わせず空配列を返す", async () => {
    const supabase = createReadSupabase({ userData: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getMealLogsAction()).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
