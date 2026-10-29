import { StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { colors, fonts, radius, spacing } from "@/theme";
import type { SayView } from "./overlay-state";

const FADE_MS = 160;
const SAY_FONT_SIZE = 15;
const SAY_MAX_LINES = 2;

interface Props {
  say: SayView | null;
  isMotionReduced: boolean;
}

/** 実況の帯。出る位置（画面上部・Safe Area の下）は呼び出し側が決める */
export function Commentary({ say, isMotionReduced }: Props) {
  if (!say) return null;
  return (
    <Animated.View
      // id が変わる = 別の発言。key で作り直して入りの動きをやり直す
      key={say.id}
      entering={isMotionReduced ? undefined : FadeIn.duration(FADE_MS)}
      exiting={isMotionReduced ? undefined : FadeOut.duration(FADE_MS)}
      style={styles.band}
    >
      <Text style={styles.text} numberOfLines={SAY_MAX_LINES}>
        {say.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: { alignSelf: "center", maxWidth: "100%", backgroundColor: "rgba(0,4,55,0.78)", borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  text: { fontFamily: fonts.bold, fontSize: SAY_FONT_SIZE, color: colors.paperWhite, textAlign: "center" },
});
