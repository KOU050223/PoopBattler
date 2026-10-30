import { StyleSheet, Text } from "react-native";

import { fontFamily } from "../fonts";
import { colors, fontSize, spacing } from "../tokens";

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.inkSoft, paddingHorizontal: spacing.sm },
});
