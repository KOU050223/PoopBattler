import { describe, expect, it } from "vitest";

import {
  parseAuthRedirectUrl,
  runGoogleOAuthFlow,
  type GoogleOAuthAuth,
  type OpenAuthSession,
} from "./google-identity";

const REDIRECT = "poopbattler://auth/callback";

function fakeAuth(overrides: Partial<GoogleOAuthAuth> = {}) {
  const calls: { method: string; credentials?: unknown; tokens?: unknown }[] = [];
  const auth: GoogleOAuthAuth = {
    linkIdentity: async (credentials) => {
      calls.push({ method: "linkIdentity", credentials });
      return { data: { url: "https://accounts.google.com/o/oauth2?x=1" }, error: null };
    },
    signInWithOAuth: async (credentials) => {
      calls.push({ method: "signInWithOAuth", credentials });
      return { data: { url: "https://accounts.google.com/o/oauth2?x=1" }, error: null };
    },
    setSession: async (tokens) => {
      calls.push({ method: "setSession", tokens });
      return { error: null };
    },
    getUser: async () => {
      calls.push({ method: "getUser" });
      return {
      data: {
        user: { id: "u1", is_anonymous: false, email: "a@b.c", identities: [{ provider: "google" }] },
      },
      error: null,
      };
    },
    ...overrides,
  };
  return { auth, calls };
}

const SUCCESS_URL = `${REDIRECT}#access_token=at&refresh_token=rt&token_type=bearer`;

function openWith(url: string): OpenAuthSession {
  return async () => ({ type: "success", url });
}

describe("parseAuthRedirectUrl", () => {
  it("fragment のトークンを取る（implicit flow）", () => {
    expect(parseAuthRedirectUrl(SUCCESS_URL)).toEqual({ accessToken: "at", refreshToken: "rt", errorCode: undefined });
  });

  it("query の error_code を取る（リンク衝突など）", () => {
    const url = `${REDIRECT}?error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked`;
    expect(parseAuthRedirectUrl(url).errorCode).toBe("identity_already_exists");
  });

  it("fragment の error_code も取る", () => {
    const url = `${REDIRECT}#error=identity_already_exists&error_description=x`;
    expect(parseAuthRedirectUrl(url).errorCode).toBe("identity_already_exists");
  });
});

describe("runGoogleOAuthFlow", () => {
  it("link: linkIdentity を呼び skipBrowserRedirect と redirectTo を渡す", async () => {
    const { auth, calls } = fakeAuth();
    const outcome = await runGoogleOAuthFlow(auth, openWith(SUCCESS_URL), REDIRECT, "link");

    expect(calls[0].method).toBe("linkIdentity");
    expect(calls[0].credentials).toEqual({
      provider: "google",
      options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
    });
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.account.hasGoogleIdentity).toBe(true);
      expect(outcome.account.isAnonymous).toBe(false);
    }
    expect(calls.map((c) => c.method)).toEqual(["linkIdentity", "setSession", "getUser"]);
  });

  it("sign-in: signInWithOAuth を使う", async () => {
    const { auth, calls } = fakeAuth();
    const outcome = await runGoogleOAuthFlow(auth, openWith(SUCCESS_URL), REDIRECT, "sign-in");
    expect(calls[0].method).toBe("signInWithOAuth");
    expect(outcome.status).toBe("ok");
  });

  it("ブラウザを閉じたら cancelled", async () => {
    const { auth } = fakeAuth();
    const outcome = await runGoogleOAuthFlow(auth, async () => ({ type: "cancel" }), REDIRECT, "link");
    expect(outcome).toEqual({ status: "cancelled" });
  });

  it("identity_already_exists は error の専用 reason", async () => {
    const { auth } = fakeAuth();
    const url = `${REDIRECT}?error=server_error&error_code=identity_already_exists`;
    const outcome = await runGoogleOAuthFlow(auth, openWith(url), REDIRECT, "link");
    expect(outcome).toEqual({ status: "error", reason: "identity_already_exists" });
  });

  it("linkIdentity 自体の設定エラーはそのまま reason に写す", async () => {
    const { auth } = fakeAuth({
      linkIdentity: async () => ({ data: null, error: { message: "x", code: "manual_linking_disabled" } }),
    });
    const outcome = await runGoogleOAuthFlow(auth, openWith(SUCCESS_URL), REDIRECT, "link");
    expect(outcome).toEqual({ status: "error", reason: "manual_linking_disabled" });
  });

  it("トークンもエラーも無いリダイレクトは unexpected-redirect（黙って成功にしない）", async () => {
    const { auth } = fakeAuth();
    const outcome = await runGoogleOAuthFlow(auth, openWith(REDIRECT), REDIRECT, "link");
    expect(outcome).toEqual({ status: "error", reason: "unexpected-redirect" });
  });
});
