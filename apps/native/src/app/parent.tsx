import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { MenuRow, NoticeCard, ParentCard, ParentScreen } from "@/design/parent";
import { colors, fontFamily, fontSize, spacing } from "@/design";
import { countThisWeek } from "@/features/account/components/week-count";
import { toLoggedAtList } from "@/features/streak/use-streak";
import { calcStreak } from "@/features/streak";
import { battleHistoryGateway } from "@/gateways";

type WeekSummary = { count: number; days: number };

// 取得に失敗してもメニューは開きたいので、まとめだけ 0 のままにする。
const EMPTY_SUMMARY: WeekSummary = { count: 0, days: 0 };

function useWeekSummary(): WeekSummary {
  const [summary, setSummary] = useState<WeekSummary>(EMPTY_SUMMARY);

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      battleHistoryGateway()
        .getBattleHistory()
        .then((history) => {
          if (isCancelled) return;
          const loggedAt = toLoggedAtList(history);
          setSummary({ count: countThisWeek(loggedAt), days: calcStreak(loggedAt).streakDays });
        })
        .catch(() => {
          if (!isCancelled) setSummary(EMPTY_SUMMARY);
        });
      return () => {
        isCancelled = true;
      };
    }, []),
  );

  return summary;
}

export default function ParentMenuScreen() {
  const { t } = useTranslation();
  const summary = useWeekSummary();
  return (
    <ParentScreen title={t("ParentMenu.title")} onBack={() => router.back()}>
      <NoticeCard tone="info">
        <View style={styles.summary}>
          <Ionicons name="calendar-outline" size={26} color={colors.sky} />
          <View>
            <Text style={styles.summaryLabel}>{t("ParentMenu.summaryLabel")}</Text>
            <Text style={styles.summaryValue}>{t("ParentMenu.summary", { count: summary.count, days: summary.days })}</Text>
          </View>
        </View>
      </NoticeCard>
      <ParentCard>
        <MenuRow
          icon="bar-chart-outline"
          label={t("ParentMenu.report")}
          description={t("ParentMenu.reportDescription")}
          badge={t("ParentMenu.premiumBadge")}
          onPress={() => router.push("/report")}
        />
        <MenuRow
          hasDivider
          icon="ribbon-outline"
          label={t("ParentMenu.plan")}
          description={t("ParentMenu.planDescription")}
          onPress={() => router.push("/purchase")}
        />
        <MenuRow
          hasDivider
          icon="person-outline"
          label={t("ParentMenu.account")}
          description={t("ParentMenu.accountDescription")}
          onPress={() => router.push("/account")}
        />
      </ParentCard>
      <Text style={styles.note}>{t("ParentMenu.familyNote")}</Text>
    </ParentScreen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  summaryLabel: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, color: colors.inkSoft },
  summaryValue: { fontFamily: fontFamily.jaBold, fontSize: fontSize.title, color: colors.ink },
  note: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, lineHeight: 19, color: colors.inkSoft, paddingHorizontal: spacing.xs },
});
