import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { saveMealLogAction } from "./actions";

const user = { id: "00000000-0000-4000-8000-000000000001" };
const photoId = "00000000-0000-4000-8000-000000000002";

function createSupabase({ userData = user, insertError = null }: {
  userData?: typeof user | null;
  insertError?: { message: string } | null;
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userData }, error: null }) },
    from: vi.fn().mockReturnValue({ insert }),
    insert,
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

    await expect(saveMealLogAction(createDraft())).resolves.toEqual({ success: true });
    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: user.id,
      eaten_at: "2026-09-02T12:34:56.000Z",
      image_path: photoId,
      tag: "curry",
      note: "昼ごはん",
    });
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
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
