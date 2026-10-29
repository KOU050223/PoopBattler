import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { photoStore } from "@/adapters/expo-photo-fs";
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from "@/design";
import type { MealLog } from "../meal-gateway";
import { foodLabelKeys } from "../meal-food-tiles";
import { groupMealLogsByDay, mealSlotOf } from "../meal-time";

const COLUMNS = 2;
const CARD_GAP = spacing.md;

function MealCard({ log }: { log: MealLog }) {
  const { t } = useTranslation();
  const [isMissing, setIsMissing] = useState(false);
  const foods = foodLabelKeys(log.foodGroups).map((key) => t(key)).join("・");

  return (
    <View style={styles.card}>
      <View style={styles.photoFrame}>
        {isMissing ? (
          <Ionicons name="image-outline" size={28} color={colors.inkSoft} accessibilityLabel={t("Gohan.photoMissing")} />
        ) : (
          <Image source={{ uri: photoStore.uriFor(log.photoId) }} style={styles.photo} resizeMode="cover" onError={() => setIsMissing(true)} />
        )}
        <View style={styles.slotTag}>
          <Text style={styles.slotLabel}>{t(`Gohan.slot.${mealSlotOf(log.eatenAt)}`)}</Text>
        </View>
      </View>
      <Text style={styles.foods} numberOfLines={2}>{foods}</Text>
    </View>
  );
}

type MealAlbumProps = { logs: readonly MealLog[]; hasError: boolean; isLoading: boolean; bottomInset: number };

export function MealAlbum({ logs, hasError, isLoading, bottomInset }: MealAlbumProps) {
  const { t } = useTranslation();
  const sections = groupMealLogsByDay(logs);

  return (
    <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomInset + spacing.xxl }]} showsVerticalScrollIndicator={false}>
      {hasError ? <Text style={styles.message} accessibilityRole="alert">{t("Gohan.loadFailed")}</Text> : null}
      {!hasError && !isLoading && sections.length === 0 ? <Text style={styles.message}>{t("Gohan.empty")}</Text> : null}
      {sections.map((section) => (
        <View key={section.day} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">{t(`Gohan.${section.day}`)}</Text>
          <View style={styles.grid}>
            {section.logs.map((log) => <MealCard key={log.id} log={log} />)}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP },
  // 2列を、間隔ぶんを引いた幅で等分する。
  card: { width: `${100 / COLUMNS - 2}%`, flexGrow: 1, gap: spacing.xs },
  // 画像の縦横比に関わらず枠を固定する。
  photoFrame: { aspectRatio: 1, borderRadius: radius.card, backgroundColor: colors.skySoft, borderWidth: borderWidth.line, borderColor: colors.line, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  photo: { ...StyleSheet.absoluteFill },
  slotTag: { position: "absolute", top: spacing.sm, left: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.paper },
  slotLabel: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.ink },
  foods: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.inkSoft },
  message: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childBase, color: colors.inkSoft, textAlign: "center" },
});
