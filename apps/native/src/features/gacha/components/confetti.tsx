import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";

import { colors } from "@/design";

const PIECE_COUNT = 40;
const MIN_FALL_MS = 1600;
const FALL_SPREAD_MS = 1200;
const MAX_DELAY_MS = 500;
const PIECE_COLORS = [colors.pink, colors.sky, colors.gold, colors.leaf, colors.sunset];
const PIECE_WIDTH = 10;
const PIECE_HEIGHT = 16;
const SWAY_PX = 40;

type Piece = { left: number; color: string; delay: number; duration: number; sway: number; spin: number };

// 毎回同じ並びにならないよう描画ごとに乱数を引くが、再描画で動き直さないよう useMemo で固定する。
function makePieces(width: number): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    left: Math.random() * width,
    color: PIECE_COLORS[i % PIECE_COLORS.length],
    delay: Math.random() * MAX_DELAY_MS,
    duration: MIN_FALL_MS + Math.random() * FALL_SPREAD_MS,
    sway: (Math.random() - 0.5) * 2 * SWAY_PX,
    spin: 1 + Math.random() * 3,
  }));
}

/** 画面の上から一度だけ降らせる。押せる操作は邪魔しない（pointerEvents none）。 */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => makePieces(width), [width]);
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = pieces.map((piece, i) =>
      Animated.timing(progress[i], {
        toValue: 1,
        duration: piece.duration,
        delay: piece.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    );
    const running = Animated.parallel(animations);
    running.start();
    return () => running.stop();
  }, [pieces, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, i) => (
        <Animated.View
          key={i}
          style={[
            styles.piece,
            {
              left: piece.left,
              backgroundColor: piece.color,
              opacity: progress[i].interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateY: progress[i].interpolate({ inputRange: [0, 1], outputRange: [-PIECE_HEIGHT, height] }) },
                { translateX: progress[i].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, piece.sway, 0] }) },
                { rotate: progress[i].interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${360 * piece.spin}deg`] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: "absolute", top: 0, width: PIECE_WIDTH, height: PIECE_HEIGHT, borderRadius: 2 },
});
