import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { weekdayShortLabel, type Weekday } from "@poopbattler/domain/report/report-labels";
import type { WeeklyReport } from "@poopbattler/domain/report/weekly-report";

import { colors, fontFamily, fontSize, spacing } from "@/design";
import { ParentCard } from "@/design/parent";

import { formatJstMonthDay, jstWeekdayIndex } from "../report-format";
import { DailyBarChart } from "./charts";
import { ReportComparison, ReportStats } from "./report-highlights";
import { toDailyBars, toMealRelationRows } from "./report-view-model";

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** 権利のある利用者へ見せる本レポート。権利の判定は report-gateway が行う。 */
export function WeeklyReportView({ report }: { report: WeeklyReport }) {
  const { t } = useTranslation();
  const bars = toDailyBars(report).map((bar) => ({
    key: bar.date,
    label: weekdayShortLabel(WEEKDAYS[jstWeekdayIndex(bar.date)]),
    count: bar.count,
  }));
  const hasDailyRecords = bars.some((bar) => bar.count > 0);
  const mealRows = toMealRelationRows(report.analysis.mealFoodGroupAnalyses);

  return (
    <>
      <Text style={styles.range}>
        {t("Report.rangeLabel", {
          start: formatJstMonthDay(report.range.startsAt),
          end: formatJstMonthDay(report.range.endsAt),
        })}
      </Text>

      <ReportStats report={report} />

      <Section title={t("Report.dailyTitle")}>
        <ParentCard>
          <View style={styles.chart}>
            {hasDailyRecords ? (
              <DailyBarChart
                items={bars}
                accessibilityLabel={`${t("Report.dailyTitle")}。${bars.map((bar) => `${bar.label} ${t("Report.times", { count: bar.count })}`).join("、")}`}
              />
            ) : (
              <Text style={styles.empty}>{t("Report.dailyEmpty")}</Text>
            )}
          </View>
        </ParentCard>
      </Section>

      <Section title={t("Report.comparisonTitle")} description={t("Report.comparisonDescription")}>
        <ReportComparison report={report} />
      </Section>

      <Section title={t("Report.mealTitle")} description={t("Report.mealDescription")}>
        {mealRows.length === 0 ? (
          <Text style={styles.empty}>{t("Report.mealEmpty")}</Text>
        ) : (
          <ParentCard>
            {mealRows.map((row, index) => (
              <View key={row.foodGroupLabel} style={[styles.mealRow, index > 0 && styles.mealDivider]}>
                <Text style={styles.mealTitle}>{t("Report.mealRowTitle", { food: row.foodGroupLabel, count: row.mealCount })}</Text>
                <Text style={styles.mealValues}>
                  {t("Report.mealAfter")} {row.targetRate}%　{t("Report.mealUsual")} {row.baselineRate}%
                </Text>
              </View>
            ))}
          </ParentCard>
        )}
      </Section>
    </>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  range: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, color: colors.inkSoft, marginTop: -spacing.sm },
  section: { gap: spacing.sm },
  sectionHead: { gap: spacing.xs, paddingHorizontal: spacing.sm },
  sectionTitle: { fontFamily: fontFamily.jaBold, fontSize: fontSize.body, color: colors.ink },
  sectionDescription: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, color: colors.inkSoft },
  chart: { padding: spacing.lg },
  empty: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, lineHeight: 19, color: colors.inkSoft, textAlign: "center", paddingVertical: spacing.md },
  mealRow: { padding: spacing.lg, gap: spacing.xs },
  mealDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  mealTitle: { fontFamily: fontFamily.jaBold, fontSize: fontSize.body, color: colors.ink },
  mealValues: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, color: colors.inkSoft },
});
