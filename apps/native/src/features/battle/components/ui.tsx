import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, fontSize, fonts, radius, spacing } from "@/theme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "special";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** 最小タップ領域 52pt。片手の親指で押せる大きさにする。 */
export function Button({ label, onPress, variant = "primary", disabled, style, children }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "special" && styles.special,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[styles.label, variant === "secondary" ? styles.labelSecondary : styles.labelOnColor, disabled && styles.labelDisabled]}
      >
        {label}
      </Text>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  primary: { backgroundColor: colors.flushEdge },
  special: { backgroundColor: colors.nightInk },
  secondary: { backgroundColor: colors.paperWhite, borderColor: colors.cottonPink },
  disabled: { backgroundColor: colors.paperWhite, borderColor: colors.fadedGray, opacity: 0.7 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  label: { fontFamily: fonts.bold, fontSize: fontSize.body + 1 },
  labelOnColor: { color: colors.paperWhite },
  labelSecondary: { color: colors.charcoal },
  labelDisabled: { color: colors.pencilGray },
});
