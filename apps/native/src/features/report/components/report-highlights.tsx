import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import type { WeeklyReport } from "@poopbattler/domain/report/weekly-report";

import { cardStyle } from "@/features/records-ui";
import { colors, fonts, spacing } from "@/theme";

/** Display the shared metrics without recalculating rates or entitlement in the UI. */
export function ReportHighlights({ report }: { report: WeeklyReport }) {
  const { t } = useTranslation();
  const { summary, comparison } = report;
  const current = comparison.current;
  const baseline = comparison.pastFourWeeks;
  const percentage = (value: number | null) => value === null ? t("Report.missingValue") : `${value}%`;
  const rows = [
    { label: t("Report.bowelCount"), current: t("Report.times", { count: current.bowelCount }), baseline: baseline.bowelCount === 0 ? t("Report.missingValue") : t("Report.weeklyAverage", { count: comparison.pastFourWeekAverageBowelCount }) },
    { label: t("Report.shapeHard"), current: percentage(current.shape.hard.rate), baseline: percentage(baseline.shape.hard.rate) },
    { label: t("Report.shapeWellFormed"), current: percentage(current.shape.well_formed.rate), baseline: percentage(baseline.shape.well_formed.rate) },
    { label: t("Report.shapeSoft"), current: percentage(current.shape.soft.rate), baseline: percentage(baseline.shape.soft.rate) },
    { label: t("Report.easyRate"), current: percentage(current.easyRate), baseline: percentage(baseline.easyRate) },
    { label: t("Report.hardRate"), current: percentage(current.hardRate), baseline: percentage(baseline.hardRate) },
  ];

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.heading} accessibilityRole="header">{t("Report.highlights")}</Text>
        <View style={styles.metrics}>
          <Metric label={t("Report.bowelCount")} value={t("Report.times", { count: summary.bowelCount })} detail={t("Report.thisWeek")} />
          <Metric label={t("Report.recordDays")} value={t("Report.days", { count: summary.recordedDays })} detail={t("Report.thisWeek")} />
          <Metric label={t("Report.shapeWellFormed")} value={percentage(summary.metrics.shape.well_formed.rate)} detail={t("Report.rateBasis")} />
          <Metric label={t("Report.easyRate")} value={percentage(summary.metrics.easyRate)} detail={t("Report.rateBasis")} />
        </View>
        {current.bowelCount === 0 ? <Text style={styles.note}>{t("Report.currentEmpty")}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.heading} accessibilityRole="header">{t("Report.comparisonTitle")}</Text>
        <Text style={styles.note}>{t("Report.comparisonDescription")}</Text>
        {baseline.bowelCount === 0 ? <Text style={styles.note}>{t("Report.baselineEmpty")}</Text> : null}
        {rows.map((row) => (
          <View key={row.label} style={styles.row} accessible accessibilityLabel={`${row.label}。${t("Report.currentPeriod")} ${row.current}。${t("Report.baselinePeriod")} ${row.baseline}`}>
            <Text style={styles.label}>{row.label}</Text>
            <View style={styles.values}>
              <View style={styles.period}>
                <Text style={styles.periodLabel}>{t("Report.currentPeriod")}</Text>
                <Text style={styles.currentValue}>{row.current}</Text>
              </View>
              <View style={styles.period}>
                <Text style={styles.periodLabel}>{t("Report.baselinePeriod")}</Text>
                <Text style={styles.baselineValue}>{row.baseline}</Text>
              </View>
            </View>
          </View>
        ))}
        <Text style={styles.note}>{t("Report.sampleNote", { current: current.bowelCount, baseline: baseline.bowelCount })}</Text>
        <Text style={styles.note}>{t("Report.comparisonNote")}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label} ${value}。${detail}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.periodLabel}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  card: { ...cardStyle, padding: spacing.lg },
  heading: { fontFamily: fonts.black, fontSize: 18, color: colors.charcoal },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  metric: { flexBasis: "45%", flexGrow: 1, minWidth: 130, backgroundColor: colors.blushWash, borderRadius: 10, padding: spacing.md, gap: spacing.sm },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.charcoal, flexShrink: 1 },
  metricValue: { fontFamily: fonts.black, fontSize: 26, color: colors.charcoal, fontVariant: ["tabular-nums"] },
  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.pencilGray, marginTop: spacing.md },
  row: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.blushWash, gap: spacing.sm },
  values: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  period: { flexBasis: "45%", flexGrow: 1, minWidth: 120, gap: 4 },
  periodLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.pencilGray, flexShrink: 1 },
  currentValue: { fontFamily: fonts.bold, fontSize: 19, color: colors.charcoal, fontVariant: ["tabular-nums"] },
  baselineValue: { fontFamily: fonts.regular, fontSize: 19, color: colors.charcoal, fontVariant: ["tabular-nums"] },
});
