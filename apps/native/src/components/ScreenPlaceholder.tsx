import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fontSize, fonts, radius, spacing } from "@/theme";

export function ScreenPlaceholder({ title, description }: { title: string; description: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  card: {
    backgroundColor: colors.paperWhite,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { fontFamily: fonts.black, fontSize: fontSize.title, color: colors.charcoal },
  description: { fontFamily: fonts.regular, fontSize: fontSize.body, lineHeight: 22, color: colors.pencilGray },
});
