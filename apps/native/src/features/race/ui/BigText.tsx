import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { colors, fonts } from "@/theme";
import type { BigTextView } from "./overlay-state";

const BIG_TEXT_FONT_SIZE = 40;
const BIG_TEXT_MAX_WIDTH_RATIO = 0.92;
const POP_FROM_SCALE = 0.4;
const POP_SPRING = { damping: 9, stiffness: 260 } as const;
const FADE_IN_MS = 80;
const FADE_OUT_MS = 160;
/** 画面の中央より少し上。下の操作パネルと指の邪魔をしない */
const CENTER_Y_RATIO = "40%";

interface Props {
  bigText: BigTextView | null;
  isPop: boolean;
}

export function BigText({ bigText, isPop }: Props) {
  if (!bigText) return null;
  return <PoppingText key={bigText.id} bigText={bigText} isPop={isPop} />;
}

function PoppingText({ bigText, isPop }: { bigText: BigTextView; isPop: boolean }) {
  const scale = useSharedValue(isPop ? POP_FROM_SCALE : 1);
  const opacity = useSharedValue(isPop ? 0 : 1);

  useEffect(() => {
    if (isPop) scale.value = withSpring(1, POP_SPRING);
    const holdMs = Math.max(0, bigText.durationMs - FADE_IN_MS - FADE_OUT_MS);
    opacity.value = withSequence(withTiming(1, { duration: isPop ? FADE_IN_MS : 0 }), withDelay(holdMs, withTiming(0, { duration: FADE_OUT_MS })));
  }, [bigText.durationMs, isPop, opacity, scale]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <View pointerEvents="none" style={styles.anchor}>
      <Animated.Text
        style={[styles.text, bigText.isBad ? styles.bad : styles.good, style]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {bigText.text}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: "absolute", left: 0, right: 0, top: CENTER_Y_RATIO, alignItems: "center" },
  text: {
    maxWidth: `${BIG_TEXT_MAX_WIDTH_RATIO * 100}%`,
    fontFamily: fonts.black,
    fontSize: BIG_TEXT_FONT_SIZE,
    textAlign: "center",
    // 縁取りの代わり。背景の色に関わらず読めるよう、白い影を1方向だけ落とす
    textShadowColor: colors.paperWhite,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  good: { color: colors.flushPink },
  bad: { color: colors.nightInk },
});
