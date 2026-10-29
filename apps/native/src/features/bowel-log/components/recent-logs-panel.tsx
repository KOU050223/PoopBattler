import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/design";

export type RecentLogRow = { key: string; dayLabel: string; shapeLabel: string };

type RecentLogsPanelProps = { title: string; rows: readonly RecentLogRow[]; emptyLabel: string; errorLabel?: string };

// 景色の上に常に出す下のパネル。Sheet は全面を覆うモーダルで、カレンダーを隠してしまうため使わない。
export function RecentLogsPanel({ title, rows, emptyLabel, errorLabel }: RecentLogsPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {errorLabel ? <Text style={styles.message} accessibilityRole="alert">{errorLabel}</Text> : null}
      {!errorLabel && rows.length === 0 ? <Text style={styles.message}>{emptyLabel}</Text> : null}
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.day}>{row.dayLabel}</Text>
          <Text style={styles.shape}>{row.shapeLabel}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  title: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.ink },
  message: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childBase, color: colors.inkSoft },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.skySoft,
    borderRadius: radius.pill,
  },
  day: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childBase, color: colors.ink },
  shape: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    fontFamily: fontFamily.jaBold,
    fontSize: fontSize.childBase,
    color: colors.ink,
  },
});
