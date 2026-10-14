import * as Haptics from "expo-haptics";
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
      onPressIn={() => {
        if (!disabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "special" && styles.special,
        disabled && styles.disabled,
        pressed && !disabled && (variant === "secondary" ? styles.pressedFlat : styles.pressed),
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
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  // 下辺に濃い縁を付けて厚みを出し、押下で沈ませる（平らなベタ塗りより押せる感が出る）。
  primary: { backgroundColor: colors.flushEdge, borderBottomWidth: 4, borderBottomColor: colors.flushDeep },
  special: { backgroundColor: colors.nightInk, borderBottomWidth: 4, borderBottomColor: "#000020" },
  secondary: { backgroundColor: colors.paperWhite, borderColor: colors.cottonPink },
  disabled: { backgroundColor: colors.paperWhite, borderColor: colors.fadedGray, opacity: 0.7 },
  pressed: { transform: [{ translateY: 3 }], borderBottomWidth: 1 },
  pressedFlat: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  label: { fontFamily: fonts.bold, fontSize: fontSize.body + 1 },
  labelOnColor: { color: colors.paperWhite },
  labelSecondary: { color: colors.charcoal },
  labelDisabled: { color: colors.pencilGray },
});
