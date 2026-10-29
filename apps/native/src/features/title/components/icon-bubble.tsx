import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing, thickness } from "@/design";
import { usePressSpring } from "@/design/kids/use-press-spring";

const LARGE_SIZE = 148;
const SMALL_SIZE = 96;

type IconBubbleProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  // large はホームの「うんちする」だけに使う。
  variant?: "large" | "small";
};

// design の BubbleButton はラベルだけでピル形のため、絵入りの丸い泡をホーム専用に持つ。
export function IconBubble({ label, icon, onPress, variant = "small" }: IconBubbleProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();
  const isLarge = variant === "large";
  const size = isLarge ? LARGE_SIZE : SMALL_SIZE;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.column, animatedStyle]}>
        <View style={[styles.circle, isLarge ? styles.circleLarge : styles.circleSmall, { width: size, height: size }]}>
          <View style={[styles.highlight, isLarge ? styles.highlightLarge : styles.highlightSmall]} />
          <Ionicons name={icon} size={isLarge ? 72 : 44} color={isLarge ? colors.paper : colors.ink} />
        </View>
        <View style={[styles.pill, isLarge ? styles.pillLarge : styles.pillSmall]}>
          <Text style={[styles.label, isLarge ? styles.labelLarge : styles.labelSmall]}>{label}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: "center" },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: borderWidth.bubble,
    borderColor: colors.bubbleBorder,
    ...shadow.bubble,
  },
  circleLarge: { backgroundColor: `${colors.pink}4d` },
  circleSmall: { backgroundColor: colors.bubbleFill },
  highlight: { position: "absolute", backgroundColor: colors.paper, opacity: 0.7, borderRadius: radius.pill },
  highlightLarge: { top: spacing.md, left: spacing.xl, width: 40, height: 16 },
  highlightSmall: { top: spacing.sm, left: spacing.lg, width: 24, height: 10 },
  // ラベルは泡に少し重ねて、泡とひとまとまりに見せる。
  pill: {
    marginTop: -spacing.lg,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  pillLarge: {
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.pink,
    borderBottomWidth: thickness.bottomEdge,
    borderBottomColor: colors.pinkEdge,
  },
  pillSmall: { backgroundColor: colors.paper },
  label: { fontFamily: fontFamily.jaBlack },
  labelLarge: { fontSize: fontSize.childBase, color: colors.paper },
  labelSmall: { fontSize: fontSize.childBase, color: colors.ink },
});
