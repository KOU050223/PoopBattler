import { describe, expect, it } from "vitest";

import { createSupabaseClient } from "./supabase-client";

const storage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };

describe("createSupabaseClient", () => {
  it("env 未設定なら不足している変数名つきで失敗する", () => {
    expect(() => createSupabaseClient({ url: undefined, anonKey: undefined }, storage)).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
    expect(() => createSupabaseClient({ url: "http://localhost:54321", anonKey: "" }, storage)).toThrow(
      /EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it("env が揃っていればクライアントを生成できる", () => {
    const client = createSupabaseClient({ url: "http://localhost:54321", anonKey: "dummy" }, storage);
    expect(client.auth).toBeDefined();
  });
});
