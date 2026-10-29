import * as Haptics from "expo-haptics";
import { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

import { spring } from "../tokens";

// 押した瞬間に縮み、離すとばねで戻る。触覚は押した瞬間に返す。
export function usePressSpring() {
  const scale = useSharedValue(1);
  // 「視差効果を減らす」がオンなら縮む動きだけ止める（触覚は残す）。
  const isReducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return {
    animatedStyle,
    onPressIn: () => {
      // 触覚が使えない端末でも押下の動作自体は止めない。
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (!isReducedMotion) scale.value = withSpring(spring.pressedScale, spring.press);
    },
    onPressOut: () => {
      if (!isReducedMotion) scale.value = withSpring(1, spring.press);
    },
  };
}
