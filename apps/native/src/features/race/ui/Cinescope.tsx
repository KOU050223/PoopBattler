import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { colors } from "@/theme";

/** 黒帯1本の高さ（画面の高さに対する割合）。縦持ちで中央に十分な絵が残る範囲 */
const BAR_HEIGHT_RATIO = 0.09;

interface Props {
  isOn: boolean;
  /** 出入りの時間。0 なら滑らせず即切り替える（reduce motion） */
  slideMs: number;
}

export function Cinescope({ isOn, slideMs }: Props) {
  const { height } = useWindowDimensions();
  const barHeight = Math.round(height * BAR_HEIGHT_RATIO);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isOn ? 1 : 0, { duration: slideMs, easing: Easing.out(Easing.cubic) });
  }, [isOn, slideMs, progress]);

  const top = useAnimatedStyle(() => ({ transform: [{ translateY: (progress.value - 1) * barHeight }] }));
  const bottom = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * barHeight }] }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.bar, styles.top, { height: barHeight }, top]} />
      <Animated.View style={[styles.bar, styles.bottom, { height: barHeight }, bottom]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, backgroundColor: colors.nightInk },
  top: { top: 0 },
  bottom: { bottom: 0 },
});
