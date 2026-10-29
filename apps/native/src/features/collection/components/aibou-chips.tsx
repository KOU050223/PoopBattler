import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/design";

// 属性は読み取り専用。押せるピンクは使わず、ご褒美色（gold）とやさしい面で区別する。
export function AibouChips({ level, attribute }: { level: string; attribute: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.chip, styles.level]}>
        <Text style={styles.text}>{level}</Text>
      </View>
      <View style={[styles.chip, styles.attribute]}>
        <Text style={styles.text}>{attribute}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  chip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  level: { backgroundColor: colors.paper },
  attribute: { backgroundColor: colors.leafSoft },
  text: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.ink },
});
