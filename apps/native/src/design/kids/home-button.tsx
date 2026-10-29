import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { borderWidth, colors, radius, shadow } from "../tokens";
import { usePressSpring } from "./use-press-spring";

const SIZE = 52;

export function HomeButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="ホームにもどる" onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.bubble, animatedStyle]}>
        <Ionicons name="home" size={26} color={colors.ink} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: borderWidth.bubble,
    borderColor: colors.bubbleBorder,
    backgroundColor: colors.bubbleFill,
    ...shadow.bubble,
  },
});
