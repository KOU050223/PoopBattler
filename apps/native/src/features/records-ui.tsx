import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fontSize, fonts, radius, spacing } from "@/theme";

export function ScreenFrame({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function Button({ label, onPress, variant = "primary", disabled, icon }: {
  label: string; onPress: () => void; variant?: "primary" | "secondary" | "danger"; disabled?: boolean; icon?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[variant], disabled && styles.disabled, pressed && styles.pressed]}
    >
      {icon}
      <Text style={[styles.buttonLabel, variant === "primary" ? styles.labelOnPrimary : variant === "danger" ? styles.labelDanger : styles.labelSecondary]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(option.value)} style={[styles.segment, selected && styles.segmentSelected]}>
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? "checkbox" : undefined} accessibilityState={{ checked: !!selected }} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export const cardStyle = {
  backgroundColor: colors.paperWhite,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.cottonPink,
} as const;

export const dateFormatter = (locale: string, value: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, gap: spacing.md },
  header: { gap: spacing.xs },
  title: { fontFamily: fonts.black, fontSize: fontSize.title, color: colors.charcoal },
  description: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.pencilGray },
  button: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  primary: { backgroundColor: colors.flushEdge },
  secondary: { backgroundColor: colors.paperWhite, borderWidth: 1, borderColor: colors.cottonPink },
  danger: { backgroundColor: colors.paperWhite, borderWidth: 1, borderColor: colors.dangerEdge },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  buttonLabel: { fontFamily: fonts.bold, fontSize: fontSize.body },
  labelOnPrimary: { color: colors.paperWhite },
  labelSecondary: { color: colors.charcoal },
  labelDanger: { color: colors.dangerEdge },
  segmented: { flexDirection: "row", backgroundColor: colors.paperWhite, borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.md - 3 },
  segmentSelected: { backgroundColor: colors.blushWash },
  segmentLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.pencilGray },
  segmentLabelSelected: { color: colors.flushEdge },
  empty: { ...cardStyle, padding: spacing.xl, gap: spacing.xs, alignItems: "center" },
  emptyTitle: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.charcoal, textAlign: "center" },
  emptyDescription: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.pencilGray, textAlign: "center" },
  chip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: 18, backgroundColor: colors.paperWhite, borderWidth: 1, borderColor: colors.cottonPink, justifyContent: "center" },
  chipSelected: { backgroundColor: colors.flushEdge, borderColor: colors.flushEdge },
  chipLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.charcoal },
  chipLabelSelected: { color: colors.paperWhite },
});
