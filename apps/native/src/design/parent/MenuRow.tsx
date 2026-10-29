import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../fonts";
import { borderWidth, colors, fontSize, radius, spacing } from "../tokens";

type MenuRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  description?: string;
  // 「プレミアム」など、ラベルの横に出す金色の印。
  badge?: string;
  onPress: () => void;
  // 2行目以降の上に区切り線を引く。ParentCard の中に並べる前提。
  hasDivider?: boolean;
};

export function MenuRow({ icon, label, description, badge, onPress, hasDivider = false }: MenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, hasDivider && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={22} color={colors.inkSoft} />
      </View>
      <View style={styles.text}>
        <View style={styles.titleLine}>
          <Text style={styles.label}>{label}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  divider: { borderTopWidth: borderWidth.line, borderTopColor: colors.line },
  pressed: { backgroundColor: colors.canvas },
  iconBox: { width: 44, height: 44, borderRadius: radius.card / 2, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, minWidth: 0, gap: spacing.xs },
  titleLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  label: { fontFamily: fontFamily.jaBold, fontSize: fontSize.body, color: colors.ink },
  description: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, lineHeight: 19, color: colors.inkSoft },
  badge: { borderRadius: radius.pill, backgroundColor: `${colors.gold}33`, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontFamily: fontFamily.jaBold, fontSize: 11, color: colors.goldEdge },
});
