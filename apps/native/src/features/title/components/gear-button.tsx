import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { borderWidth, colors, radius, shadow } from "@/design";
import { usePressSpring } from "@/design/kids/use-press-spring";

const SIZE = 52;

type GearButtonProps = { label: string; onPress: () => void; onLongPress?: () => void };

export function GearButton({ label, onPress, onLongPress }: GearButtonProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.bubble, animatedStyle]}>
        <Ionicons name="settings-outline" size={26} color={colors.ink} />
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
