import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../fonts";
import { borderWidth, colors, fontSize, radius, spacing } from "../tokens";

type ListRowProps = {
  label: string;
  onPress: () => void;
  // 未読件数や「新着」など、行の右端（矢印の左）に出す短い印。
  badge?: string;
};

export function ListRow({ label, onPress, badge }: ListRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text accessibilityElementsHidden style={styles.chevron}>
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  pressed: { backgroundColor: colors.canvas },
  label: { flex: 1, fontFamily: fontFamily.jaMedium, fontSize: fontSize.body, color: colors.ink },
  badge: { borderRadius: radius.pill, borderWidth: borderWidth.line, borderColor: colors.line, backgroundColor: colors.canvas, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.inkSoft },
  chevron: { fontFamily: fontFamily.numBold, fontSize: 24, color: colors.inkSoft },
});
