import { describe, expect, it, vi } from "vitest";

import {
  buildCallbackUrl,
  linkGoogleIdentity,
  signInWithGoogle,
  type GoogleIdentityAuth,
} from "./google-identity";

function createAuth(overrides: Partial<GoogleIdentityAuth> = {}): GoogleIdentityAuth {
  return {
    linkIdentity: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    ...overrides,
  };
}

describe("linkGoogleIdentity", () => {
  it("Googleへのリダイレクトを開始したことを返す", async () => {
    const auth = createAuth();

    const result = await linkGoogleIdentity(auth, "http://localhost:3000/auth/callback");

    expect(result).toEqual({ status: "redirecting" });
    expect(auth.linkIdentity).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback" },
    });
  });

  it("既に同じGoogleアカウントが使われている場合は衝突として返す", async () => {
    const auth = createAuth({
      linkIdentity: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Identity is already linked", code: "identity_already_exists" },
      }),
    });

    const result = await linkGoogleIdentity(auth, "http://localhost:3000/auth/callback");

    expect(result.status).toBe("conflict");
    expect(result).toMatchObject({
      message: expect.stringContaining("既に別のアカウントで使われています"),
    });
  });

  it("連携がサーバー側で無効な場合は設定を確認するよう促す", async () => {
    const auth = createAuth({
      linkIdentity: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Manual linking is disabled", code: "manual_linking_disabled" },
      }),
    });

    const result = await linkGoogleIdentity(auth, "http://localhost:3000/auth/callback");

    expect(result).toEqual({
      status: "error",
      message: "アカウント連携がサーバー側で有効になっていません。設定を確認してください。",
    });
  });

  it("Googleプロバイダ自体が無効な場合も設定を確認するよう促す", async () => {
    const auth = createAuth({
      linkIdentity: vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: "Unsupported provider: provider is not enabled",
          code: "validation_failed",
        },
      }),
    });

    const result = await linkGoogleIdentity(auth, "http://localhost:3000/auth/callback");

    expect(result).toEqual({
      status: "error",
      message: "Googleログインがサーバー側で有効になっていません。設定を確認してください。",
    });
  });

  it("想定外の失敗でもSupabaseの英語メッセージを利用者へ見せない", async () => {
    const auth = createAuth({
      linkIdentity: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Something went terribly wrong", code: "unexpected_failure" },
      }),
    });

    const result = await linkGoogleIdentity(auth, "http://localhost:3000/auth/callback");

    expect(result).toEqual({
      status: "error",
      message: "Googleとの連携に失敗しました。時間をおいてもう一度お試しください。",
    });
  });
});

describe("signInWithGoogle", () => {
  it("既存アカウントへのログインを開始する", async () => {
    const auth = createAuth();

    const result = await signInWithGoogle(auth, "http://localhost:3000/auth/callback?next=%2F");

    expect(result).toEqual({ status: "redirecting" });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback?next=%2F" },
    });
    // ログインは連携ではないため linkIdentity は呼ばない。
    expect(auth.linkIdentity).not.toHaveBeenCalled();
  });
});

describe("buildCallbackUrl", () => {
  it("戻り先を next クエリに載せたコールバックURLを作る", () => {
    expect(buildCallbackUrl("http://localhost:3000", "/meals")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fmeals",
    );
  });
});
