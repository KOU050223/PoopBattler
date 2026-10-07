import { describe, expect, it, vi } from "vitest";

import { ensureAnonymousSession, type AnonymousSessionAuth } from "./anonymous-session";

function makeAuth(overrides: Partial<AnonymousSessionAuth> = {}): AnonymousSessionAuth {
  return {
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    getUser: vi.fn(async () => ({ data: { user: {} }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    signInAnonymously: vi.fn(async () => ({ data: { user: {} }, error: null })),
    ...overrides,
  };
}

describe("ensureAnonymousSession", () => {
  it("有効な既存セッションは再利用し、サインインしない", async () => {
    const auth = makeAuth({ getSession: vi.fn(async () => ({ data: { session: {} }, error: null })) });
    expect(await ensureAnonymousSession(auth)).toEqual({ status: "ready" });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("セッションが無ければ匿名サインインする", async () => {
    const auth = makeAuth();
    expect(await ensureAnonymousSession(auth)).toEqual({ status: "ready" });
    expect(auth.signInAnonymously).toHaveBeenCalledOnce();
  });

  it("復旧可能な無効セッションはローカル破棄して再サインインする", async () => {
    const auth = makeAuth({
      getSession: vi.fn(async () => ({ data: { session: {} }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: null }, error: { message: "x", code: "session_not_found" } })),
    });
    expect(await ensureAnonymousSession(auth)).toEqual({ status: "ready" });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
