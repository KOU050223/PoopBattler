import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fontFamily } from "../fonts";
import { colors, fontSize, spacing } from "../tokens";

type ParentScreenProps = {
  title: string;
  onBack?: () => void;
  children: ReactNode;
};

// 親の画面は子どもの画面と違い、ホームに戻るのではなく一つ前に戻る。
export function ParentScreen({ title, onBack, children }: ParentScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="戻る" hitSlop={spacing.sm} onPress={onBack} style={styles.back}>
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
        ) : null}
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -spacing.sm },
  backGlyph: { fontFamily: fontFamily.numBold, fontSize: 32, lineHeight: 36, color: colors.ink },
  title: { flexShrink: 1, fontFamily: fontFamily.jaBold, fontSize: fontSize.title, color: colors.ink },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
});
