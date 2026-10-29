import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import Animated from "react-native-reanimated";

import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing, thickness } from "@/design";
import { usePressSpring } from "@/design/kids/use-press-spring";

import { homePalette } from "../home-palette";

// 絵は泡の内側に少し小さい円で収める（画面案: 152/104 に対して 116/78）。
const IMAGE_RATIO = 0.75;

type IconBubbleProps = {
  label: string;
  image: ImageSourcePropType;
  onPress: () => void;
  // large はホームの「うんちする」だけに使う。
  variant?: "large" | "small";
  // 小さい画面で縮めるため、呼び出し側が幅から計算して渡す（home-layout.ts）。
  size: number;
};

// design の BubbleButton はラベルだけでピル形のため、絵入りの丸い泡をホーム専用に持つ。
export function IconBubble({ label, image, onPress, variant = "small", size }: IconBubbleProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();
  const isLarge = variant === "large";
  const imageSize = Math.round(size * IMAGE_RATIO);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.column, animatedStyle]}>
        <View style={[styles.circle, isLarge ? styles.circleLarge : styles.circleSmall, { width: size, height: size }]}>
          <View style={[styles.highlight, isLarge ? styles.highlightLarge : styles.highlightSmall]} />
          <Image source={image} style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }} resizeMode="cover" />
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
  circleLarge: { backgroundColor: homePalette.largeBubbleFill, borderColor: homePalette.largeBubbleBorder },
  circleSmall: { backgroundColor: homePalette.smallBubbleFill, borderColor: homePalette.smallBubbleBorder },
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
