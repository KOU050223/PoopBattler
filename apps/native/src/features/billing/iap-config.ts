/**
 * RevenueCat の Public API Key を読む。
 *
 * EXPO_PUBLIC_* はビルド時に静的置換されるため動的キー参照にしない
 * （lib/supabase.ts と同じ制約）。キー自体は公開前提の値（app バイナリに
 * 同梱される公開鍵）だが、リポジトリにはハードコードせず環境変数から取る。
 * 未設定でもアプリは起動する必要があるため、ここで throw はしない。
 */
export function getRevenueCatApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
  return typeof key === "string" && key.length > 0 ? key : null;
}
