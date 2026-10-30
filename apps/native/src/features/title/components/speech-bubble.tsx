import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/design";

type SpeechBubbleProps = { message: string };

// セリフは将来、相棒ごとの文に差し替わるので、文字列は呼び出し側から受け取る。
export function SpeechBubble({ message }: SpeechBubbleProps) {
  return (
    <View style={styles.column} accessibilityRole="text">
      <View style={styles.balloon}>
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={styles.dotLarge} />
      <View style={styles.dotSmall} />
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: "center" },
  balloon: { backgroundColor: colors.paper, borderRadius: radius.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  message: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childBase, color: colors.ink },
  dotLarge: { marginTop: spacing.xs, width: 14, height: 14, borderRadius: radius.pill, backgroundColor: colors.paper },
  dotSmall: { marginTop: spacing.xs, width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.paper },
});
