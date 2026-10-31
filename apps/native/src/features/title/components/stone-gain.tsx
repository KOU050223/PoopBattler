import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors, fontFamily, fontSize, radius, shadow, spacing, spring } from "@/design";

const VISIBLE_MS = 2200;
const FADE_MS = 300;
const STONE_RISE = 36;
const STONE_STAGGER_MS = 120;
// 石の粒を出しすぎると画面が散らかるので、見せる数は頭打ちにする。
const MAX_STONE_ICONS = 5;

type StoneGainProps = {
  count: number;
  label: string;
  onDone: () => void;
};

// ホームの中央に「いし +3こ」と石が浮かんで消える。位置の誘導は文言に任せ、押せる要素にはしない。
export function StoneGain({ count, label, onDone }: StoneGainProps) {
  const isReducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(isReducedMotion ? 1 : 0.6);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    opacity.value = withSequence(withTiming(1, { duration: FADE_MS }), withDelay(VISIBLE_MS, withTiming(0, { duration: FADE_MS })));
    if (!isReducedMotion) scale.value = withSpring(1, spring.press);
    const timer = setTimeout(onDone, VISIBLE_MS + FADE_MS * 2);
    return () => clearTimeout(timer);
  }, [isReducedMotion, onDone, opacity, scale]);

  const cardStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const stoneCount = Math.min(count, MAX_STONE_ICONS);

  return (
    <View pointerEvents="none" style={styles.overlay} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.stones}>
          {Array.from({ length: stoneCount }, (_, index) => (
            <RisingStone key={index} index={index} isStill={isReducedMotion} />
          ))}
        </View>
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </View>
  );
}

function RisingStone({ index, isStill }: { index: number; isStill: boolean }) {
  const lift = useSharedValue(isStill ? 0 : STONE_RISE);
  useEffect(() => {
    if (isStill) return;
    lift.value = withDelay(index * STONE_STAGGER_MS, withTiming(0, { duration: 500, easing: Easing.out(Easing.back(2)) }));
  }, [index, isStill, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name="diamond" size={32} color={colors.gold} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  card: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
    backgroundColor: colors.paper,
    ...shadow.bubble,
  },
  stones: { flexDirection: "row", gap: spacing.xs },
  label: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.ink },
});
