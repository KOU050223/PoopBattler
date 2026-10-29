import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { fontFamily } from "../fonts";
import { borderWidth, colors, fontSize, radius, spacing } from "../tokens";

type ParentButtonProps = {
  label: string;
  onPress: () => void;
  // primary は購入など「進む」操作だけ。pink は押せる合図なので、1画面に1つまで。
  variant?: "primary" | "secondary" | "danger-text";
  disabled?: boolean;
  icon?: ReactNode;
};

export function ParentButton({ label, onPress, variant = "secondary", disabled = false, icon }: ParentButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon}
      <Text style={[styles.label, variant === "primary" && styles.primaryLabel, variant === "danger-text" && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  primary: { backgroundColor: colors.pink },
  secondary: { backgroundColor: colors.paper, borderWidth: borderWidth.line, borderColor: colors.line },
  "danger-text": { backgroundColor: "transparent" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  label: { fontFamily: fontFamily.jaBold, fontSize: fontSize.body, color: colors.ink },
  primaryLabel: { color: colors.paper },
  // 赤はこの1か所だけ。tokens に危険色が無いため、退会の文字色として固定する。
  dangerLabel: { color: "#c0392b", fontSize: fontSize.caption },
});
