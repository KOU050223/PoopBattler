import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import { deleteUserCompletely } from "./user-deletion";

const userId = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  mocks.createClient.mockReturnValue({
    auth: { admin: { deleteUser: mocks.deleteUser } },
  });
  mocks.deleteUser.mockResolvedValue({ error: null });
});

describe("deleteUserCompletely", () => {
  it("サービスロールのクライアントで対象ユーザーを削除する", async () => {
    await expect(deleteUserCompletely(userId)).resolves.toEqual({ status: "ok" });

    // 公開キーやセッションを持ったクライアントで消せてしまうと、
    // 境界の外からユーザーが消せる経路になる。
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://example.test",
      "service-role-key",
      expect.objectContaining({
        auth: { autoRefreshToken: false, persistSession: false },
      }),
    );
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });

  it("削除の失敗を成功として返さない", async () => {
    mocks.deleteUser.mockResolvedValue({ error: { code: "user_not_found" } });

    await expect(deleteUserCompletely(userId)).resolves.toEqual({
      status: "error",
      reason: "user_not_found",
    });
  });

  // サービスロールキーが未設定でも throw を呼び出し側へ漏らさない。
  // 退会の成否は戻り値だけで判断できる形にする。
  it("接続情報が無くても error として返す", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(deleteUserCompletely(userId)).resolves.toMatchObject({ status: "error" });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
