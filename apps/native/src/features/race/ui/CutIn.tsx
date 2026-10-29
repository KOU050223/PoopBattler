import { useEffect } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { colors, fonts, spacing } from "@/theme";
import { OVERLAY_TIMING, type CutInView } from "./overlay-state";

const BAND_HEIGHT = 104;
const BAND_TOP_RATIO = "26%";
const ACCENT_WIDTH = 6;
const FADE_OUT_MS = 180;
const NAME_FONT_SIZE = 14;
const LINE_FONT_SIZE = 28;

interface Props {
  cutIn: CutInView | null;
  /** 横から滑り込む時間。0 なら動かさず出す（reduce motion） */
  slideMs: number;
}

export function CutIn({ cutIn, slideMs }: Props) {
  if (!cutIn) return null;
  return <CutInBand key={cutIn.id} cutIn={cutIn} slideMs={slideMs} />;
}

function CutInBand({ cutIn, slideMs }: { cutIn: CutInView; slideMs: number }) {
  const { width } = useWindowDimensions();
  const offsetX = useSharedValue(slideMs > 0 ? -width : 0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (slideMs > 0) offsetX.value = withTiming(0, { duration: slideMs, easing: Easing.out(Easing.cubic) });
    opacity.value = withDelay(Math.max(0, OVERLAY_TIMING.cutInMs - FADE_OUT_MS), withTiming(0, { duration: FADE_OUT_MS }));
  }, [slideMs, offsetX, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: offsetX.value }] }));

  return (
    <Animated.View pointerEvents="none" style={[styles.band, style]}>
      <View style={styles.accent} />
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {cutIn.name}
        </Text>
        <Text style={styles.line} numberOfLines={1} adjustsFontSizeToFit>
          {cutIn.line}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: { position: "absolute", left: 0, right: 0, top: BAND_TOP_RATIO, height: BAND_HEIGHT, flexDirection: "row", backgroundColor: "rgba(0,4,55,0.9)" },
  accent: { width: ACCENT_WIDTH, backgroundColor: colors.flushPink },
  texts: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg, gap: spacing.xs },
  name: { fontFamily: fonts.bold, fontSize: NAME_FONT_SIZE, color: colors.cottonPink },
  line: { fontFamily: fonts.black, fontSize: LINE_FONT_SIZE, color: colors.paperWhite },
});
