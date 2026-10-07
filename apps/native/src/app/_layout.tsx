import "@/i18n";

import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ensureAnonymousSession } from "@/lib/anonymous-session";
import { bindAutoRefreshToAppState, getSupabase } from "@/lib/supabase";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold });

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
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
