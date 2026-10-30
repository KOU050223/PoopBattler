import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import type { WeeklyReport } from "@poopbattler/domain/report/weekly-report";

import { colors, fontFamily, fontSize, spacing } from "@/design";
import { ParentCard } from "@/design/parent";

import { toComparisonRows, type ComparisonRow } from "./report-view-model";

type Value = ComparisonRow["current"];

/** 値の表示。null は「出せない」で、0 とは別物として — にする。 */
function useFormatValue() {
  const { t } = useTranslation();
  return (value: Value) => {
    if (value === null) return t("Report.missingValue");
    return value.unit === "percent" ? `${value.value}%` : t("Report.times", { count: value.value });
  };
}

/** 上部の3つの数字。割合の計算は domain 側の値をそのまま表示する。 */
export function ReportStats({ report }: { report: WeeklyReport }) {
  const { t } = useTranslation();
  const format = useFormatValue();
  const [count, wellFormed, easy] = toComparisonRows(report);
  const stats = [
    { label: t("Report.statCount"), value: format(count.current), accent: null },
    { label: t("Report.statWellFormed"), value: format(wellFormed.current), accent: colors.leaf },
    { label: t("Report.statEasy"), value: format(easy.current), accent: colors.sky },
  ];

  return (
    <View style={styles.stats}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <ParentCard>
            <View style={styles.statBody} accessible accessibilityLabel={`${stat.label} ${stat.value}`}>
              <View style={styles.statLabelLine}>
                {stat.accent ? <View style={[styles.dot, { backgroundColor: stat.accent }]} /> : null}
                <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
              </View>
              <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{stat.value}</Text>
            </View>
          </ParentCard>
        </View>
      ))}
    </View>
  );
}

/** 今週と過去4週間（今週を除く）の比較表。 */
export function ReportComparison({ report }: { report: WeeklyReport }) {
  const { t } = useTranslation();
  const format = useFormatValue();
  const { current, pastFourWeeks } = report.comparison;
  const rowLabels: Record<ComparisonRow["key"], string> = {
    count: t("Report.rowCount"),
    wellFormed: t("Report.rowWellFormed"),
    easy: t("Report.rowEasy"),
    hard: t("Report.rowHard"),
  };

  return (
    <View style={styles.comparison}>
      <ParentCard>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.rowLabel} />
            <Text style={[styles.periodHead, styles.cell]}>{t("Report.currentPeriod")}</Text>
            <Text style={[styles.periodHead, styles.cell]}>{t("Report.baselinePeriod")}</Text>
          </View>
          {toComparisonRows(report).map((row) => (
            <View
              key={row.key}
              style={[styles.tableRow, styles.rowDivider]}
              accessible
              accessibilityLabel={`${rowLabels[row.key]}。${t("Report.currentPeriod")} ${format(row.current)}。${t("Report.baselinePeriod")} ${format(row.baseline)}`}
            >
              <Text style={[styles.rowLabel, styles.rowLabelText]}>{rowLabels[row.key]}</Text>
              <Text style={[styles.cell, styles.currentValue]}>{format(row.current)}</Text>
              <Text style={[styles.cell, styles.baselineValue]}>{format(row.baseline)}</Text>
            </View>
          ))}
        </View>
      </ParentCard>
      {current.bowelCount === 0 ? <Text style={styles.note}>{t("Report.currentEmpty")}</Text> : null}
      {pastFourWeeks.bowelCount === 0 ? <Text style={styles.note}>{t("Report.baselineEmpty")}</Text> : null}
      {current.bowelCount > 0 && pastFourWeeks.bowelCount > 0 ? (
        <Text style={styles.note}>{t("Report.sampleNote", { current: current.bowelCount, baseline: pastFourWeeks.bowelCount })}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1, minWidth: 0 },
  statBody: { padding: spacing.md, gap: spacing.xs },
  statLabelLine: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { flexShrink: 1, fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.inkSoft },
  // 親の画面のトークンに大きな数字用が無いため、子ども用の見出しサイズを借りる。
  statValue: { fontFamily: fontFamily.numExtraBold, fontSize: fontSize.childTitle, color: colors.ink },
  comparison: { gap: spacing.sm },
  table: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  tableRow: { flexDirection: "row", alignItems: "center", minHeight: 44, gap: spacing.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { flex: 1.6, minWidth: 0 },
  rowLabelText: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.ink },
  cell: { flex: 1, textAlign: "right" },
  periodHead: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.inkSoft },
  currentValue: { fontFamily: fontFamily.numExtraBold, fontSize: fontSize.body, color: colors.ink },
  baselineValue: { fontFamily: fontFamily.numBold, fontSize: fontSize.body, color: colors.inkSoft },
  note: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, lineHeight: 19, color: colors.inkSoft, paddingHorizontal: spacing.sm },
});
