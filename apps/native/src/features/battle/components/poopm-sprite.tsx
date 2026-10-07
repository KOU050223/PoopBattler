import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

import type { PoopmAppearance } from "../poopm-appearance";
import { BODY_IMAGES, EYE_IMAGES, HEAD_IMAGES, MOUTH_IMAGES } from "../poopm-images";

/** body 207x220 を基準にしたパーツ配置（web の poopm-figure と同じ割合。手足は最小実装のため省略）。 */
export function PoopmSprite({
  appearance,
  hitKey,
  mirrored,
  size,
  dimmed,
}: {
  appearance: PoopmAppearance;
  hitKey: number;
  mirrored?: boolean;
  size: number;
  dimmed?: boolean;
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  useEffect(() => {
    if (hitKey === 0) return;
    shake.setValue(0);
    flash.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 90, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
  }, [hitKey, shake, flash]);

  const width = size;
  const height = (size * 260) / 207;
  const box = (left: number, top: number, w: number, ratio: number) => ({
    position: "absolute" as const,
    left: `${left}%` as const,
    top: `${top}%` as const,
    width: `${w}%` as const,
    aspectRatio: ratio,
  });

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      style={{
        width,
        height,
        opacity: dimmed ? 0.4 : 1,
        transform: [
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
          { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) },
          { scaleX: mirrored ? -1 : 1 },
        ],
      }}
    >
      <View style={StyleSheet.absoluteFill}>
        <Image source={BODY_IMAGES[appearance.color]} style={box(9, 12, 82, 207 / 220)} resizeMode="contain" />
        <Image source={HEAD_IMAGES[appearance.head]} style={box(31, 0, 38, 108 / 80)} resizeMode="contain" />
        <Image source={MOUTH_IMAGES[appearance.mouth]} style={box(35, 68, 30, 80 / 60)} resizeMode="contain" />
        <Image source={EYE_IMAGES[appearance.eyes]} style={box(29, 39, 42, 128 / 87)} resizeMode="contain" />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.hitTint, { opacity: flash }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hitTint: { backgroundColor: "#dc686855", borderRadius: 24 },
});
