import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { colors, fonts, radius, spacing } from "@/theme";
import type { RivalLabelPlacement } from "./overlay-state";

/** placeRivalLabel に渡す名札の大きさ。ここと見た目をそろえる */
export const RIVAL_LABEL_SIZE = { width: 96, height: 24 } as const;
const NAME_FONT_SIZE = 12;

interface Props {
  name: string;
  /** 画面座標での中心。呼び出し側が毎フレーム three/project.ts で投影して書く（React の再描画なし） */
  placement: SharedValue<RivalLabelPlacement>;
}

/** カメラが撮っているライバルの名札 */
export function RivalLabel({ name, placement }: Props) {
  const style = useAnimatedStyle(() => ({
    opacity: placement.value.isVisible ? 1 : 0,
    transform: [{ translateX: placement.value.x - RIVAL_LABEL_SIZE.width / 2 }, { translateY: placement.value.y - RIVAL_LABEL_SIZE.height / 2 }],
  }));

  return (
    <Animated.Text pointerEvents="none" style={[styles.label, style]} numberOfLines={1}>
      {name}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  label: {
    position: "absolute",
    left: 0,
    top: 0,
    width: RIVAL_LABEL_SIZE.width,
    height: RIVAL_LABEL_SIZE.height,
    lineHeight: RIVAL_LABEL_SIZE.height,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: NAME_FONT_SIZE,
    color: colors.paperWhite,
    backgroundColor: "rgba(0,4,55,0.72)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
    overflow: "hidden",
  },
});
