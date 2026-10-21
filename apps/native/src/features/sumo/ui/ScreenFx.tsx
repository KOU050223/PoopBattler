import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import {
  rayAngleDeg,
  SCREEN_FX_CENTER_Y_RATIO,
  screenFxPlan,
  type LinesSpec,
  type ScreenFxTrigger,
} from "./screen-fx";

interface Props {
  trigger: ScreenFxTrigger | null;
  isMotionReduced: boolean;
}

export function ScreenFx({ trigger, isMotionReduced }: Props) {
  const { width, height } = useWindowDimensions();
  const flashProgress = useRef(new Animated.Value(0)).current;
  const linesProgress = useRef(new Animated.Value(0)).current;
  const triggerId = trigger?.id;
  const plan = useMemo(() => screenFxPlan(trigger, isMotionReduced), [trigger, isMotionReduced]);

  // id が変わった時だけ再生する。plan は同じ id の再描画では再生し直さない
  useEffect(() => {
    flashProgress.setValue(0);
    linesProgress.setValue(0);
    const animations: Animated.CompositeAnimation[] = [];
    if (plan.flash) {
      animations.push(
        Animated.timing(flashProgress, {
          toValue: 1,
          duration: plan.flash.durationMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      );
    }
    if (plan.lines) {
      animations.push(
        Animated.timing(linesProgress, {
          toValue: 1,
          duration: plan.lines.durationMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      );
    }
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerId]);

  if (!trigger || (!plan.flash && !plan.lines)) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {plan.flash ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flash,
            { opacity: flashProgress.interpolate({ inputRange: [0, 1], outputRange: [plan.flash.peakOpacity, 0] }) },
          ]}
        />
      ) : null}
      {plan.lines ? (
        <Lines spec={plan.lines} progress={linesProgress} width={width} height={height} />
      ) : null}
    </View>
  );
}

interface LinesProps {
  spec: LinesSpec;
  progress: Animated.Value;
  width: number;
  height: number;
}

function Lines({ spec, progress, width, height }: LinesProps) {
  const longSide = Math.max(width, height);
  const innerRadius = longSide * spec.innerRadiusRatio;
  // 画面の四隅まで届く長さ
  const rayLength = Math.hypot(width, height) * 0.75 - innerRadius;
  const rays = useMemo(
    () => Array.from({ length: spec.rayCount }, (_, index) => rayAngleDeg(index, spec.rayCount)),
    [spec.rayCount],
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.linesCenter,
        {
          left: width / 2,
          top: height * SCREEN_FX_CENTER_Y_RATIO,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [spec.startOpacity, 0] }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [spec.startScale, 1] }) },
            { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${spec.endRotationDeg}deg`] }) },
          ],
        },
      ]}
    >
      {rays.map((angleDeg) => (
        // 0x0 の View を回し、子を半径方向にずらすと中心が抜けた放射状になる
        <View key={angleDeg} style={[styles.rayPivot, { transform: [{ rotate: `${angleDeg}deg` }] }]}>
          <View
            style={{
              position: "absolute",
              left: innerRadius,
              top: -spec.rayWidth / 2,
              width: rayLength,
              height: spec.rayWidth,
              backgroundColor: `rgba(${spec.rayColor},${spec.rayOpacity})`,
            }}
          />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 試作の radial-gradient 相当を View だけで出せないので、全面の白で代用する
  flash: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(235,255,245,0.85)" },
  linesCenter: { position: "absolute", width: 0, height: 0 },
  rayPivot: { position: "absolute", left: 0, top: 0, width: 0, height: 0 },
});
