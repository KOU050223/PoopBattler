import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { borderWidth, colors, radius } from "@/design";

export const FLUSH_DURATION_MS = 1800;
const SWIRL_TURNS = 3;
const SHAKE_PX = 3;
const SHAKE_STEPS = 12;

type ToiletFlushProps = {
  isFlushing: boolean;
  /** 「視差効果を減らす」がオンなら回転・揺れを止め、待ち時間だけ残す。 */
  reduceMotion: boolean;
  onFlushed: () => void;
  size: number;
};

// 流れる演出は絵を増やさず View で組む。水面の渦が回りながら縮み、最後にうんちが現れる流れ。
export function ToiletFlush({ isFlushing, reduceMotion, onFlushed, size }: ToiletFlushProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFlushing) {
      progress.setValue(0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 400 : FLUSH_DURATION_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onFlushed();
    });
    return () => animation.stop();
  }, [isFlushing, reduceMotion, onFlushed, progress]);

  const spin = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${-360 * SWIRL_TURNS}deg`] });
  const swirlScale = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.6, 0] });
  const shakeRange = Array.from({ length: SHAKE_STEPS + 1 }, (_, i) => i / SHAKE_STEPS);
  const shakeX = progress.interpolate({
    inputRange: shakeRange,
    outputRange: shakeRange.map((_, i) => (i % 2 === 0 || i === SHAKE_STEPS ? 0 : i % 4 === 1 ? SHAKE_PX : -SHAKE_PX)),
  });

  const tankWidth = size * 0.5;
  const bowlWidth = size * 0.9;
  const bowlHeight = size * 0.5;

  return (
    <Animated.View
      accessibilityRole="image"
      style={[styles.root, { width: size, height: size }, !reduceMotion && { transform: [{ translateX: shakeX }] }]}
    >
      <View style={[styles.tank, { width: tankWidth, height: size * 0.32 }]}>
        <View style={styles.lever} />
      </View>
      <View style={[styles.bowl, { width: bowlWidth, height: bowlHeight }]}>
        <View style={[styles.water, { width: bowlWidth * 0.78, height: bowlHeight * 0.62 }]}>
          <Animated.View style={reduceMotion ? undefined : { transform: [{ rotate: spin }, { scale: swirlScale }] }}>
            <Ionicons name="sync" size={size * 0.28} color={colors.sky} />
          </Animated.View>
        </View>
      </View>
      <View style={[styles.base, { width: size * 0.4, height: size * 0.12 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "flex-end" },
  tank: {
    backgroundColor: colors.paper,
    borderRadius: radius.card / 2,
    borderWidth: borderWidth.bubble,
    borderColor: colors.sky,
    alignItems: "flex-end",
    padding: 6,
  },
  lever: { width: 18, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  bowl: {
    marginTop: -6,
    backgroundColor: colors.paper,
    borderWidth: borderWidth.bubble,
    borderColor: colors.sky,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderBottomLeftRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  water: {
    backgroundColor: colors.skySoft,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  base: { backgroundColor: colors.paper, borderWidth: borderWidth.bubble, borderColor: colors.sky, borderRadius: radius.card / 2 },
});
