import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

import { createSupabaseClient } from "./supabase-client";

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  // EXPO_PUBLIC_* はビルド時に静的置換されるため、動的キー参照にしてはいけない。
  client ??= createSupabaseClient(
    {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
      anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    AsyncStorage,
  );
  return client;
}

/** フォアグラウンド時のみトークン自動更新を回す。解除関数を返す。 */
export function bindAutoRefreshToAppState(supabase: SupabaseClient): () => void {
  const apply = (state: string) =>
    state === "active" ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh();
  apply(AppState.currentState);
  const sub = AppState.addEventListener("change", apply);
  return () => {
    sub.remove();
    void supabase.auth.stopAutoRefresh();
  };
}
