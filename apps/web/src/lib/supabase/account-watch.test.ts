import { describe, expect, it, vi } from "vitest";

import { watchAccountStatus, type AccountWatchAuth } from "./account-watch";

function createAuth(user: unknown) {
  const listeners: (() => void)[] = [];
  const unsubscribe = vi.fn();

  const auth: AccountWatchAuth = {
    getUser: vi.fn().mockImplementation(async () => ({ data: { user } })),
    onAuthStateChange: (callback) => {
      listeners.push(callback);
      return { data: { subscription: { unsubscribe } } };
    },
  };

  return { auth, listeners, unsubscribe };
}

describe("watchAccountStatus", () => {
  it("購読した直後に現在の状態を渡す", async () => {
    const onChange = vi.fn();
    const { auth } = createAuth({
      is_anonymous: false,
      email: "player@example.com",
      identities: [{ provider: "google" }],
    });

    watchAccountStatus(auth, onChange);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());

    expect(onChange).toHaveBeenCalledWith({
      signedIn: true,
      isAnonymous: false,
      hasGoogleIdentity: true,
      email: "player@example.com",
    });
  });

  it("認証状態が変わったら読み直す", async () => {
    // 匿名サインインはブラウザで完了するため、この経路が無いと
    // ヘッダーは「未ログイン」のまま更新されない。
    const onChange = vi.fn();
    const { auth, listeners } = createAuth({ is_anonymous: true });

    watchAccountStatus(auth, onChange);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    listeners.forEach((listener) => listener());
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
  });

  it("読み取りに失敗しても未サインインとして扱い、例外を投げない", async () => {
    const onChange = vi.fn();
    const auth: AccountWatchAuth = {
      getUser: vi.fn().mockRejectedValue(new Error("offline")),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    };

    watchAccountStatus(auth, onChange);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());

    expect(onChange).toHaveBeenCalledWith({
      signedIn: false,
      isAnonymous: false,
      hasGoogleIdentity: false,
      email: null,
    });
  });

  it("解除したら購読を止め、以降は通知しない", async () => {
    const onChange = vi.fn();
    const { auth, listeners, unsubscribe } = createAuth({ is_anonymous: true });

    const stop = watchAccountStatus(auth, onChange);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    stop();
    listeners.forEach((listener) => listener());
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
