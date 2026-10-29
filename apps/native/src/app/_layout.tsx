import "@/i18n";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { fontAssets } from "@/design";
import { ensureAnonymousSession } from "@/lib/anonymous-session";
import { bindAutoRefreshToAppState, getSupabase } from "@/lib/supabase";
import { colors, fonts } from "@/theme";

void SplashScreen.preventAutoHideAsync();

// (tabs)/_layout.tsx と同じ理由で style 関連は弱い型に当たるため、
// ヘッダータイトルは Text コンポーネントで渡す（Stack の headerTitleStyle 型が
// fontSize/fontWeight を必須化しており fontFamily 単独が入らない）。

export default function RootLayout() {
  const { t } = useTranslation();
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    const supabase = getSupabase();
    const unbind = bindAutoRefreshToAppState(supabase);
    void ensureAnonymousSession(supabase.auth).then((result) => {
      if (result.status === "error") console.warn("匿名サインインに失敗:", result.message);
    });
    return unbind;
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* タブ外の詳細画面はヘッダー + 戻るボタンを出す（web のページ内遷移に相当）。
            ヘッダー中央は web と同じく固定ワードマーク。ページ名は各画面内の大見出しが担う。 */}
        {(["meals", "dev/index", "dev/toilet-detect", "dev/poopm-3d", "dev/design-gallery"] as const).map((name) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              headerShown: name !== "meals",
              headerTitle: () => (
                <Text style={{ fontFamily: fonts.black, fontSize: 16, color: colors.charcoal }}>{t("Common.headerAppNameShort")}</Text>
              ),
            }}
          />
        ))}
        {/* 親の画面は ParentScreen が自前のヘッダー（戻る + 見出し）を持つので、ワードマークのヘッダーは出さない。 */}
        <Stack.Screen name="parent" />
        <Stack.Screen name="report" />
        <Stack.Screen name="account" />
        <Stack.Screen name="purchase" />
      </Stack>
    </SafeAreaProvider>
  );
}
