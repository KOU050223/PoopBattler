import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import "@/i18n/records";
import { BattleHistory } from "@/features/bowel-log/components/BattleHistory";
import { cardStyle, ScreenFrame } from "@/features/records-ui";
import { colors, fontSize, fonts, radius, spacing } from "@/theme";

// web の /logs と同じ構成: 「今週のレポート」カード + バトル履歴。
// 食事記録は /meals の独立画面（コレクション空状態から到達）。
export default function LogsScreen() {
  const { t } = useTranslation();
  return (
    <ScreenFrame title={t("Pages.logs.title")} description={t("Pages.logs.description")}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/report")}
        style={({ pressed }) => [styles.reportCard, pressed && styles.pressed]}
      >
        <View style={styles.reportIcon}>
          <Ionicons name="stats-chart-outline" size={20} color={colors.flushEdge} />
        </View>
        <View style={styles.reportText}>
          <View style={styles.reportTitleRow}>
            <Text style={styles.reportTitle}>{t("Report.entryTitle")}</Text>
            <Text style={styles.premiumBadge}>{t("Report.premium")}</Text>
          </View>
          <Text style={styles.reportDescription}>{t("Report.entryDescription")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.pencilGray} />
      </Pressable>
      <View style={styles.flex}>
        <BattleHistory bottomInset={spacing.lg} />
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  reportCard: {
    ...cardStyle,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.blushWash,
    alignItems: "center",
    justifyContent: "center",
  },
  reportText: { flex: 1, minWidth: 0 },
  reportTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reportTitle: { fontFamily: fonts.black, fontSize: fontSize.body, color: colors.charcoal },
  premiumBadge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.flushEdge,
    backgroundColor: colors.blushWash,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  reportDescription: { fontFamily: fonts.regular, fontSize: 13, color: colors.pencilGray, marginTop: 2 },
});
