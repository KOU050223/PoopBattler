import { StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../fonts";
import { colors, fontSize, radius, spacing } from "../tokens";

// 表示専用。押せると誤解されないよう、onPress は props に持たない。厚みも影もつけない。
export type SideTabProps = { label: string; value?: string };

export function SideTab({ label, value }: SideTabProps) {
  return (
    <View style={styles.tab} accessibilityRole="text">
      <Text style={styles.label}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    backgroundColor: colors.paper,
    // 画面の右端から出ているように、左側だけ丸める。
    borderTopLeftRadius: radius.pill,
    borderBottomLeftRadius: radius.pill,
  },
  label: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.inkSoft },
  value: { fontFamily: fontFamily.numExtraBold, fontSize: fontSize.childBase, color: colors.ink },
});
