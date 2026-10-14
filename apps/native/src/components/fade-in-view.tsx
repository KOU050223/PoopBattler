import { useEffect, useRef, type ReactNode } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";

import { useReduceMotion } from "@/features/poopm-3d/use-reduce-motion";

const DURATION_MS = 280;
const RISE_PX = 10;

/** 下から少しだけ浮かびながら現れる。reduce-motion のときは動かさず即表示する。 */
export function FadeInView({ delay = 0, style, children }: { delay?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, { toValue: 1, duration: DURATION_MS, delay, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [RISE_PX, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}
