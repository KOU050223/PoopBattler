import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import "@/i18n/kiroku";
import { colors, fontFamily, fontSize, radius, spacing } from "@/design";
import { HomeButton, SceneBackground } from "@/design/kids";
import { calcStreak } from "@/features/streak/calc-streak";
import { MonthCalendar } from "@/features/bowel-log/components/month-calendar";
import { RecentLogsPanel } from "@/features/bowel-log/components/recent-logs-panel";
import { toBowelShape } from "@/features/bowel-log/hardness-shape";
import { loggedDaysInMonth, pickRecentLogs, toDayLabel } from "@/features/bowel-log/kiroku-calendar";
import { battleHistoryGateway } from "@/gateways";
import { useLoader } from "@/hooks/use-loader";

const RECENT_LIMIT = 3;

export default function LogsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: history, error } = useLoader(() => battleHistoryGateway().getBattleHistory());

  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  const { streakDays, loggedDays, recentRows } = useMemo(() => {
    const logs = history ?? [];
    const recorded = logs.filter((log) => log.bowelLog);
    return {
      streakDays: calcStreak(recorded.map((log) => log.completedAt)).streakDays,
      loggedDays: loggedDaysInMonth(logs, year, monthIndex),
      recentRows: pickRecentLogs(logs, RECENT_LIMIT).map((log) => {
        const label = toDayLabel(log.completedAt);
        return {
          key: log.battleId,
          dayLabel: t(`Kiroku.${label.kind}`, { month: label.month, day: label.day, time: label.time }),
          shapeLabel: t(`Kiroku.shape.${toBowelShape(log.hardness)}`),
        };
      }),
    };
    // now は毎描画で変わるため、日付の依存は year / monthIndex に畳んでいる。
  }, [history, year, monthIndex, t]);

  return (
    <SceneBackground>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <HomeButton onPress={() => router.push("/")} />
        <Text style={styles.titlePill} accessibilityRole="header">{t("Kiroku.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.streak} accessible accessibilityLabel={`${t("Kiroku.streakLabel")} ${streakDays}${t("Kiroku.streakUnit")}`}>
          <View style={styles.flame}>
            <Ionicons name="flame" size={32} color={colors.sunset} />
          </View>
          <View>
            <Text style={styles.streakLabel}>{t("Kiroku.streakLabel")}</Text>
            <View style={styles.streakValueRow}>
              <Text style={styles.streakValue}>{streakDays}</Text>
              <Text style={styles.streakUnit}>{t("Kiroku.streakUnit")}</Text>
            </View>
          </View>
        </View>
        <View style={styles.calendar}>
          <MonthCalendar
            year={year}
            monthIndex={monthIndex}
            title={t("Kiroku.monthTitle", { month: monthIndex + 1 })}
            weekdays={t("Kiroku.weekdays", { returnObjects: true }) as unknown as string[]}
            loggedDays={loggedDays}
            today={now.getDate()}
            stampedLabel={t("Kiroku.stamped")}
          />
        </View>
      </ScrollView>
      <RecentLogsPanel
        title={t("Kiroku.recentTitle")}
        rows={recentRows}
        emptyLabel={t("Kiroku.empty")}
        errorLabel={error ? t("Kiroku.loadFailed") : undefined}
      />
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  // 左の家ボタンと幅を揃えて、タイトルを中央に置く。
  headerSpacer: { width: 52 },
  titlePill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    fontFamily: fontFamily.jaBlack,
    fontSize: fontSize.childTitle,
    color: colors.ink,
  },
  body: { padding: spacing.lg, gap: spacing.lg },
  streak: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    borderTopWidth: 4,
    borderTopColor: colors.gold,
  },
  flame: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: `${colors.gold}40` },
  streakLabel: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.inkSoft },
  streakValueRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
  streakValue: { fontFamily: fontFamily.numExtraBold, fontSize: fontSize.childTitle + 8, color: colors.ink },
  streakUnit: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childBase, color: colors.ink },
  calendar: { width: "100%", maxWidth: 480, alignSelf: "center" },
});
