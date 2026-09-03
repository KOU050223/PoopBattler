import { describe, expect, it, vi } from "vitest";

import { ensureAnonymousSession } from "./anonymous-session";

describe("ensureAnonymousSession", () => {
  it("既存セッションのユーザーが有効な場合は匿名サインインを実行しない", async () => {
    const signInAnonymously = vi.fn();
    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "existing" } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "existing-user" } },
        error: null,
      }),
      signInAnonymously,
    });

    expect(result).toEqual({ status: "ready" });
    expect(signInAnonymously).not.toHaveBeenCalled();
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
      signInAnonymously,
    });

    expect(result).toEqual({ status: "ready" });
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });

  it("匿名サインインに失敗した理由を再試行用に返す", async () => {
    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn(),
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

    const result = await ensureAnonymousSession({
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "stale" } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "User from sub claim in JWT does not exist" },
      }),
      signInAnonymously,
    });

    expect(result).toEqual({ status: "ready" });
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });
});
