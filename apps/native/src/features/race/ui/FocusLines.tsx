import { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/theme";
import type { MotionPlan } from "./overlay-state";

const RAY_COUNT = 40;
/** 画面の対角の半分に対する、線が始まる半径の割合（中央は抜く） */
const INNER_RADIUS_RATIO = 0.34;
const RAY_MIN_HALF_ANGLE = 0.018;
const RAY_HALF_ANGLE_RANGE = 0.03;
const RAY_OPACITY = 0.55;
const FADE_MS = 220;
const FLICKER_LOW = 0.65;
const FLICKER_MS = 90;

/** 線の太さと角度の揺れは固定の式で決める。描くたびに形が変わらず、乱数のシードも要らない */
function raysPath(size: number): string {
  const center = size / 2;
  const innerRadius = center * INNER_RADIUS_RATIO;
  const segments: string[] = [];
  for (let i = 0; i < RAY_COUNT; i++) {
    const angle = (i / RAY_COUNT) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.04;
    const halfAngle = RAY_MIN_HALF_ANGLE + ((Math.sin(i * 78.233) + 1) / 2) * RAY_HALF_ANGLE_RANGE;
    const apexX = center + Math.cos(angle) * innerRadius;
    const apexY = center + Math.sin(angle) * innerRadius;
    const baseA = `${center + Math.cos(angle - halfAngle) * center} ${center + Math.sin(angle - halfAngle) * center}`;
    const baseB = `${center + Math.cos(angle + halfAngle) * center} ${center + Math.sin(angle + halfAngle) * center}`;
    segments.push(`M${apexX} ${apexY}L${baseA}L${baseB}Z`);
  }
  return segments.join("");
}

interface Props {
  isOn: boolean;
  motion: MotionPlan;
}

/** 放射状の集中線。回転と明滅は shared value だけで動かし、React は再描画しない */
export function FocusLines({ isOn, motion }: Props) {
  const { width, height } = useWindowDimensions();
  // 回しても画面の四隅が欠けないよう、対角の長さの正方形に描く
  const size = Math.ceil(Math.hypot(width, height));
  const path = useMemo(() => raysPath(size), [size]);
  const level = useSharedValue(0);
  const flicker = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    level.value = withTiming(isOn ? 1 : 0, { duration: FADE_MS });
  }, [isOn, level]);

  const { focusLinesSpinSec, isFocusLinesFlicker } = motion;
  useEffect(() => {
    if (!isOn) return;
    if (focusLinesSpinSec !== null) {
      rotation.value = withRepeat(withTiming(360, { duration: focusLinesSpinSec * 1000, easing: Easing.linear }), -1);
    }
    if (isFocusLinesFlicker) {
      flicker.value = withRepeat(withSequence(withTiming(FLICKER_LOW, { duration: FLICKER_MS }), withTiming(1, { duration: FLICKER_MS })), -1);
    }
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(flicker);
      flicker.value = 1;
    };
  }, [isOn, focusLinesSpinSec, isFocusLinesFlicker, rotation, flicker]);

  const style = useAnimatedStyle(() => ({
    opacity: level.value * flicker.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.layer, { width: size, height: size, left: (width - size) / 2, top: (height - size) / 2 }, style]}>
      <Svg width={size} height={size}>
        <Path d={path} fill={colors.paperWhite} fillOpacity={RAY_OPACITY} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute" },
});
