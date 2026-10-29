import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/design";

import { barRatio } from "./report-view-model";

export type DailyBarItem = { key: string; label: string; count: number };

const TRACK_HEIGHT = 120;
const STUB_HEIGHT = 4;

/**
 * 毎日の回数。回数は必ず文字でも置き、棒は見た目の補助にする（読み上げのため）。
 * 0回の日は棒を描かず細い線だけにして、「記録なし」と「少ない」を見分けられるようにする。
 */
export function DailyBarChart({ items, accessibilityLabel }: { items: DailyBarItem[]; accessibilityLabel: string }) {
  const max = Math.max(...items.map((item) => item.count), 0);

  return (
    <View style={styles.row} accessible accessibilityRole="summary" accessibilityLabel={accessibilityLabel}>
      {items.map((item) => (
        <View key={item.key} style={styles.col}>
          <Text style={styles.count}>{item.count}</Text>
          <View style={styles.track}>
            {item.count === 0 ? (
              <View style={styles.stub} />
            ) : (
              <View style={[styles.bar, { height: TRACK_HEIGHT * barRatio(item.count, max) }]} />
            )}
          </View>
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  col: { flex: 1, minWidth: 0, alignItems: "center", gap: spacing.xs },
  count: { fontFamily: fontFamily.numBold, fontSize: fontSize.caption, color: colors.inkSoft },
  track: { height: TRACK_HEIGHT, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "70%", maxWidth: 36, borderRadius: radius.pill, backgroundColor: colors.leaf },
  stub: { width: "70%", maxWidth: 36, height: STUB_HEIGHT, borderRadius: radius.pill, backgroundColor: colors.line },
  label: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.inkSoft },
});
