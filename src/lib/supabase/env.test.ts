import { afterEach, describe, expect, it } from "vitest";

import { getServiceRoleEnvironment, getSupabaseEnvironment } from "./env";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
});

describe("getSupabaseEnvironment", () => {
  it("公開 URL と公開可能キーを返す", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    expect(getSupabaseEnvironment()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("公開接続情報が足りない場合は設定エラーにする", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => getSupabaseEnvironment()).toThrow(
      "Supabase の公開接続情報が設定されていません。",
    );
  });
});

describe("getServiceRoleEnvironment", () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });

  it("URL とサービスロールキーを返す", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";

    expect(getServiceRoleEnvironment()).toEqual({
      url: "https://example.supabase.co",
      serviceRoleKey: "service_role_test",
    });
  });

  it("サービスロールキーが無い場合は設定エラーにする", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getServiceRoleEnvironment()).toThrow(
      "Supabase のサービスロール接続情報が設定されていません。",
    );
  });

  // 公開キー用の経路が秘密鍵を返せる形になっていないことを固定する。
  it("公開接続情報の取得はサービスロールキーを返さない", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";

    expect(getSupabaseEnvironment()).not.toHaveProperty("serviceRoleKey");
  });
});
