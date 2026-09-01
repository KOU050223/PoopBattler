import { afterEach, describe, expect, it } from "vitest";

import { getSupabaseEnvironment } from "./env";

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
