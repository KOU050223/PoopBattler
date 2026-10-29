import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { fontFamily } from "../fonts";
import { borderWidth, colors, fontSize, radius, shadow, spacing, thickness } from "../tokens";
import { usePressSpring } from "./use-press-spring";

type BubbleButtonProps = {
  label: string;
  onPress: () => void;
  // large はホームの「うんちする」のような最重要の操作だけに使う。
  variant?: "large" | "small";
  accessibilityLabel?: string;
};

export function BubbleButton({ label, onPress, variant = "small", accessibilityLabel }: BubbleButtonProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();
  const isLarge = variant === "large";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.base, isLarge ? styles.large : styles.small, animatedStyle]}>
        <View style={[styles.highlight, isLarge ? styles.highlightLarge : styles.highlightSmall]} />
        <Text style={[styles.label, isLarge ? styles.labelLarge : styles.labelSmall]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: borderWidth.bubble,
    borderColor: colors.bubbleBorder,
    ...shadow.bubble,
  },
  large: {
    minHeight: 72,
    paddingHorizontal: spacing.xxxl,
    backgroundColor: colors.pink,
    // 下辺だけ濃くして、ぷっくりした厚みを出す。
    borderBottomWidth: borderWidth.bubble + thickness.bottomEdge,
    borderBottomColor: colors.pinkEdge,
  },
  small: {
    // 指で押せる最小の高さ 44 を確保する。
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bubbleFill,
  },
  highlight: { position: "absolute", backgroundColor: colors.paper, opacity: 0.7, borderRadius: radius.pill },
  highlightLarge: { top: spacing.sm, left: spacing.xl, width: 36, height: 14 },
  highlightSmall: { top: spacing.xs, left: spacing.lg, width: 22, height: 8 },
  label: { fontFamily: fontFamily.jaBlack },
  labelLarge: { fontSize: fontSize.childTitle, color: colors.paper },
  labelSmall: { fontSize: fontSize.childBase, color: colors.ink },
});
