import { describe, expect, it, vi } from "vitest";

import { ensureAnonymousSession } from "./anonymous-session";

describe("ensureAnonymousSession", () => {
  it("サーバーで有効な既存セッションがある場合は匿名サインインを実行しない", async () => {
    const signInAnonymously = vi.fn();
    const signOut = vi.fn();
    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "existing" } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
      signOut,
      signInAnonymously,
    });

    expect(result).toEqual({ status: "ready" });
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("セッションがない場合は匿名サインインを実行する", async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { user: { id: "anonymous-user" } },
      error: null,
    });

    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn(),
      signOut: vi.fn(),
      signInAnonymously,
    });

    expect(result).toEqual({ status: "ready" });
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });

  it("期限切れのリフレッシュトークンは捨てて匿名サインインし直す", async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { user: { id: "new-anonymous" } },
      error: null,
    });
    const signOut = vi.fn().mockResolvedValue({ error: null });

    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "stale" } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid Refresh Token: Refresh Token Not Found", code: "refresh_token_not_found" },
      }),
      signOut,
      signInAnonymously,
    });

    expect(result).toEqual({ status: "ready" });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });

  it("通信失敗など期限切れ以外の getUser 失敗では新しい匿名アカウントを作らない", async () => {
    const signInAnonymously = vi.fn();
    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "existing" } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "ネットワークに接続できません" },
      }),
      signOut: vi.fn(),
      signInAnonymously,
    });

    expect(result).toEqual({
      status: "error",
      message: "ネットワークに接続できません",
    });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("匿名サインインに失敗した理由を再試行用に返す", async () => {
    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn(),
      signOut: vi.fn(),
      signInAnonymously: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "ネットワークに接続できません" },
      }),
    });

    expect(result).toEqual({
      status: "error",
      message: "ネットワークに接続できません",
    });
  });

  it("既存セッションの取得に失敗した理由を返す", async () => {
    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: "セッションを確認できません" },
      }),
      getUser: vi.fn(),
      signOut: vi.fn(),
      signInAnonymously: vi.fn(),
    });

    expect(result).toEqual({
      status: "error",
      message: "セッションを確認できません",
    });
  });

  it("ユーザー情報が返らない匿名サインインでは再試行を促す", async () => {
    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn(),
      signOut: vi.fn(),
      signInAnonymously: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    });

    expect(result).toEqual({ status: "error", message: "もう一度お試しください。" });
  });

  it("既存セッションのユーザー確認に失敗したら匿名サインインし直す", async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { user: { id: "new-anonymous-user" } },
      error: null,
    });
    const signOut = vi.fn().mockResolvedValue({ error: null });

    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "stale" } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "User from sub claim in JWT does not exist" },
      }),
      signOut,
      signInAnonymously,
    });

    expect(result).toEqual({ status: "ready" });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });
});
