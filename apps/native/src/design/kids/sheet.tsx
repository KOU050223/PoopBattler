import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";
import Animated, { SlideInDown, useReducedMotion } from "react-native-reanimated";

import { colors, radius, spacing, spring } from "../tokens";

type SheetProps = { visible: boolean; onClose: () => void; children: ReactNode };

export function Sheet({ visible, onClose, children }: SheetProps) {
  const isReducedMotion = useReducedMotion();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="とじる" accessibilityRole="button" />
      <Animated.View
        style={styles.sheet}
        entering={isReducedMotion ? undefined : SlideInDown.springify().damping(spring.gentle.damping).stiffness(spring.gentle.stiffness)}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: `${colors.ink}40` },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
});
