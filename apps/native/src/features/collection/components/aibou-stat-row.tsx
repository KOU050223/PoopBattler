import { StyleSheet, Text, View } from "react-native";

import { fontFamily, colors, fontSize, radius, spacing } from "@/design";

export type AibouStat = { label: string; value: number };

// 表示専用の白いピル。押せる見た目（ピンク・厚み）にしない。
export function AibouStatRow({ stats }: { stats: readonly AibouStat[] }) {
  return (
    <View style={styles.row}>
      {stats.map(({ label, value }) => (
        <View key={label} style={styles.pill} accessible accessibilityLabel={`${label} ${value}`}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  label: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.inkSoft },
  value: { fontFamily: fontFamily.numExtraBold, fontSize: fontSize.childBase, color: colors.ink },
});
