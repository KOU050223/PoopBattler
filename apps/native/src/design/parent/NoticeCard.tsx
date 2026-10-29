import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../fonts";
import { colors, fontSize, radius, spacing } from "../tokens";

type NoticeCardProps = {
  // gold はプレミアムの案内、warn は記録が消えるなどの注意、info は今週のまとめ。
  tone: "gold" | "warn" | "info";
  title?: string;
  icon?: ReactNode;
  children?: ReactNode;
};

const toneStyles = {
  gold: { backgroundColor: `${colors.gold}1f`, borderColor: `${colors.gold}66` },
  warn: { backgroundColor: `${colors.sunset}1a`, borderColor: `${colors.sunset}66` },
  info: { backgroundColor: colors.skySoft, borderColor: colors.skySoft },
} as const;

export function NoticeCard({ tone, title, icon, children }: NoticeCardProps) {
  return (
    <View style={[styles.card, toneStyles[tone]]}>
      {title ? (
        <View style={styles.titleLine}>
          {icon}
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  titleLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, fontFamily: fontFamily.jaBold, fontSize: fontSize.body, color: colors.ink },
});
