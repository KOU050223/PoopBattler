import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import {
  BOWEL_COLOR_LABELS,
  weekdayLabel,
  weekdayShortLabel,
  type BowelColor,
  type Weekday,
} from "@poopbattler/domain/report/report-labels";
import type { WeeklyReport } from "@poopbattler/domain/report/weekly-report";

import { cardStyle } from "@/components/ui";
import { colors, fonts, spacing } from "@/theme";

import { formatJstMonthDay, jstWeekdayIndex } from "../report-format";
import { BarChart, ShareBar, TrendLine } from "./charts";
import { ReportHighlights } from "./report-highlights";

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME_OF_DAY_COLORS = ["#ffd28f", colors.flushPink, colors.flushEdge, colors.nightInk];

/** 権利のある利用者へ見せる本レポート。権利の判定は report-gateway が行う。 */
export function WeeklyReportView({ report, notice = null }: {
  report: WeeklyReport;
  /** 購入直後などに出す案内。無ければ null。 */
  notice?: string | null;
}) {
  const { t } = useTranslation();
  const { breakdown, analysis } = report;

  return (
    <View style={styles.stack}>
      <View>
        <View style={styles.premiumRow}>
          <Ionicons name="stats-chart" size={14} color={colors.charcoal} />
          <Text style={styles.premiumLabel}>{t("Report.premium")}</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">{t("Report.title")}</Text>
        <Text style={styles.rangeText}>
          {t("Report.range", {
            start: formatJstMonthDay(report.range.startsAt),
            end: formatJstMonthDay(report.range.endsAt),
          })}
        </Text>
      </View>

      {notice ? (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <ReportHighlights report={report} />

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{t("Report.hardnessTitle")}</Text>
        <Text style={styles.cardSub}>{t("Report.hardnessDescription")}</Text>
        {/* ハイライトと同じType 3〜4を強調する。3区分表示への更新は #205。 */}
        <BarChart
          label={t("Report.recordsByHardness")}
          emptyLabel={t("Report.noRecords")}
          bars={breakdown.hardness.map((count, index) => ({
            label: String(index + 1),
            value: count,
            highlighted: index + 1 >= 3 && index + 1 <= 4,
          }))}
        />
        <Text style={styles.note}>{t("Report.stableBandNote")}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{t("Report.otherRecords")}</Text>
        <View style={styles.shareGroup}>
          <Text style={styles.groupHeading}>{t("Report.amount")}</Text>
          <ShareBar
            label={t("Report.amount")}
            emptyLabel={t("Report.noRecords")}
            segments={[
              { key: "small", label: t("Report.small"), value: breakdown.amount.small, color: colors.cottonPink },
              { key: "normal", label: t("Report.normal"), value: breakdown.amount.normal, color: colors.flushPink },
              { key: "large", label: t("Report.large"), value: breakdown.amount.large, color: colors.flushEdge },
            ]}
          />
        </View>
        <View style={styles.shareGroup}>
          <Text style={styles.groupHeading}>{t("Report.ease")}</Text>
          <ShareBar
            label={t("Report.ease")}
            emptyLabel={t("Report.noRecords")}
            segments={[
              { key: "easy", label: t("Report.easy"), value: breakdown.ease.easy, color: colors.cottonPink },
              { key: "normal", label: t("Report.normal"), value: breakdown.ease.normal, color: colors.flushPink },
              { key: "hard", label: t("Report.hard"), value: breakdown.ease.hard, color: colors.flushEdge },
            ]}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeadingRow}>
          <Ionicons name="color-palette" size={18} color={colors.flushEdge} />
          <Text style={styles.cardHeading}>{t("Report.colorTitle")}</Text>
        </View>
        <ShareBar
          label={t("Report.colorTitle")}
          emptyLabel={t("Report.noRecords")}
          segments={(Object.keys(BOWEL_COLOR_LABELS) as BowelColor[]).map((key) => ({
            key,
            label: BOWEL_COLOR_LABELS[key].label,
            value: breakdown.color[key],
            color: BOWEL_COLOR_LABELS[key].hex,
          }))}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{t("Report.dailyRecords")}</Text>
        <BarChart
          label={t("Report.dailyRecords")}
          emptyLabel={t("Report.noRecords")}
          height="sm"
          bars={analysis.dailyCounts.map((day) => ({
            label: weekdayShortLabel(WEEKDAYS[jstWeekdayIndex(day.date)]),
            caption: formatJstMonthDay(`${day.date}T00:00:00+09:00`),
            value: day.count,
          }))}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{t("Report.weekdayAndTime")}</Text>
        <Text style={styles.cardSub}>
          {t("Report.mostFrequentWeekdayShort", { weekday: mostFrequentWeekdays(analysis.weekdayCounts, t("Report.noRecords")) })}
        </Text>
        <BarChart
          label={t("Report.weekdayAndTime")}
          emptyLabel={t("Report.noRecords")}
          height="sm"
          bars={WEEKDAYS.map((weekday) => ({ label: weekdayShortLabel(weekday), value: analysis.weekdayCounts[weekday] }))}
        />
        {/* 夜と深夜を1つに丸めない。web と同じ区分を保つ。 */}
        <View style={[styles.cardHeadingRow, { marginTop: spacing.lg }]}>
          <Ionicons name="time" size={14} color={colors.flushEdge} />
          <Text style={styles.groupHeading}>{t("Report.timeOfDay")}</Text>
        </View>
        <ShareBar
          label={t("Report.timeOfDay")}
          emptyLabel={t("Report.noRecords")}
          segments={(["morning", "afternoon", "evening", "night"] as const).map((key, index) => ({
            key,
            label: t(`Report.${key}`),
            value: analysis.timeOfDayCounts[key],
            color: TIME_OF_DAY_COLORS[index],
          }))}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{t("Report.fourWeekTrend")}</Text>
        <TrendLine
          label={t("Report.fourWeekTrend")}
          emptyLabel={t("Report.noRecords")}
          points={analysis.fourWeekTrend.map((week) => ({
            key: week.weekStartsAt,
            label: `${formatJstMonthDay(week.weekStartsAt)}${t("Report.week")}`,
            value: week.bowelCount,
            caption: t("Report.average", { value: week.averageHardness ?? "-" }),
          }))}
        />
      </View>
    </View>
  );
}

function mostFrequentWeekdays(counts: Record<Weekday, number>, emptyLabel: string) {
  const highest = Math.max(...Object.values(counts));
  if (highest === 0) return emptyLabel;
  return (Object.entries(counts) as [Weekday, number][])
    .filter(([, count]) => count === highest)
    .map(([weekday]) => weekdayLabel(weekday))
    .join("・");
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg, paddingBottom: spacing.lg },
  premiumRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  premiumLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.charcoal },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.charcoal, letterSpacing: -0.5 },
  rangeText: { fontFamily: fonts.regular, fontSize: 15, color: colors.charcoal, marginTop: 4 },
  notice: {
    backgroundColor: colors.blushWash,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  noticeText: { fontFamily: fonts.regular, fontSize: 14, color: colors.charcoal },
  card: { ...cardStyle, padding: spacing.lg },
  cardHeadingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardHeading: { fontFamily: fonts.black, fontSize: 18, color: colors.charcoal, letterSpacing: -0.3 },
  cardSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.pencilGray, marginTop: 4 },
  groupHeading: { fontFamily: fonts.black, fontSize: 14, color: colors.charcoal },
  shareGroup: { marginTop: spacing.lg },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.pencilGray, marginTop: spacing.md },
});
