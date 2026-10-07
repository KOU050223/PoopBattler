import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";

export type SupabaseEnv = {
  url: string | undefined;
  anonKey: string | undefined;
};

export function createSupabaseClient(
  env: SupabaseEnv,
  storage: SupportedStorage,
): SupabaseClient {
  const missing = [
    !env.url && "EXPO_PUBLIC_SUPABASE_URL",
    !env.anonKey && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);
  if (missing.length > 0 || !env.url || !env.anonKey) {
    throw new Error(
      `Supabase の環境変数が未設定です: ${missing.join(", ")}（apps/native/.env.example を参照）`,
    );
  }
  return createClient(env.url, env.anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      // RN には URL バーがないため、URL からのセッション検出は無効にする。
      detectSessionInUrl: false,
    },
  });
}
