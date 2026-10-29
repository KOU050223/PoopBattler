import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from "@/design";
import { HomeButton, SceneBackground } from "@/design/kids";
import { mealGateway } from "@/gateways";
import { useLoader } from "@/hooks/use-loader";
import { MealEditSheet } from "@/features/meal/components/meal-edit-sheet";
import type { MealLog } from "@/features/meal/meal-gateway";
import type { MealEditResult } from "@/features/meal/meal-record-edit";
import { MealAlbum } from "@/features/meal/components/meal-album";
import { MealRecordSheet } from "@/features/meal/components/meal-record-sheet";
import { pickMealPhoto } from "@/features/meal/meal-photo-picker";

export default function MealsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, error, loading, reload } = useLoader(() => mealGateway().getMealLogs());
  const [pickedUri, setPickedUri] = useState<string>();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [noticeKey, setNoticeKey] = useState<string>();
  const [selectedLog, setSelectedLog] = useState<MealLog>();

  const pick = async (source: "camera" | "library") => {
    const result = await pickMealPhoto(source);
    if (result.status === "picked") {
      setNoticeKey(undefined);
      setPickedUri(result.uri);
      setIsSheetOpen(true);
    }
    if (result.status === "denied") setNoticeKey(source === "camera" ? "Gohan.permissionCamera" : "Gohan.permissionLibrary");
  };

  const finishEdit = (result: MealEditResult) => {
    setSelectedLog(undefined);
    setNoticeKey(result.status === "skipped" ? undefined : result.noticeKey);
    if (result.status !== "skipped") void reload();
  };

  return (
    <SceneBackground>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.titleRow}>
          <View style={styles.homeSlot}><HomeButton onPress={() => router.replace("/")} /></View>
          <View style={styles.titlePill}><Text style={styles.title} accessibilityRole="header">{t("Gohan.title")}</Text></View>
          <View style={styles.homeSlot} />
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.cameraBubble} onPress={() => void pick("camera")} accessibilityRole="button">
            <Ionicons name="camera-outline" size={26} color={colors.paper} />
            <Text style={styles.cameraLabel}>{t("Gohan.takePhoto")}</Text>
          </Pressable>
          <Pressable style={styles.albumBubble} onPress={() => void pick("library")} accessibilityRole="button" accessibilityLabel={t("Gohan.album")}>
            <Ionicons name="images-outline" size={26} color={colors.ink} />
          </Pressable>
        </View>
        {noticeKey ? <Text style={styles.notice} accessibilityRole="alert">{t(noticeKey)}</Text> : null}
      </View>

      <View style={styles.paper}>
        <MealAlbum logs={data ?? []} hasError={Boolean(error)} isLoading={loading} bottomInset={insets.bottom} onSelect={setSelectedLog} />
      </View>

      <MealEditSheet log={selectedLog} onClose={() => setSelectedLog(undefined)} onFinished={finishEdit} />
      <MealRecordSheet
        visible={isSheetOpen}
        initialPhotoUri={pickedUri}
        onClose={() => setIsSheetOpen(false)}
        onSaved={() => { setIsSheetOpen(false); void reload(); }}
      />
    </SceneBackground>
  );
}

const BUBBLE_HEIGHT = 64;

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  homeSlot: { width: 52 },
  titlePill: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.paper },
  title: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.ink },
  actions: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  cameraBubble: { flex: 1, height: BUBBLE_HEIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.pill, borderWidth: borderWidth.bubble, borderColor: colors.bubbleBorder, backgroundColor: colors.pink, borderBottomColor: colors.pinkEdge, ...shadow.bubble },
  cameraLabel: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.paper },
  albumBubble: { width: BUBBLE_HEIGHT, height: BUBBLE_HEIGHT, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, borderWidth: borderWidth.bubble, borderColor: colors.bubbleBorder, backgroundColor: colors.bubbleFill, ...shadow.bubble },
  notice: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.ink, textAlign: "center" },
  // 景色の上に下から立ち上がる白いシート。上に余白を残して景色を見せる。
  paper: { flex: 1, marginTop: spacing.lg, backgroundColor: colors.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: "hidden" },
});
