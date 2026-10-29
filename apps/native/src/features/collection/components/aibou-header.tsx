import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from "@/design";
import { HomeButton } from "@/design/kids";

type AibouHeaderProps = {
  name: string;
  previousLabel: string;
  nextLabel: string;
  onHome: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

const ARROW_SIZE = 44;

export function AibouHeader({ name, previousLabel, nextLabel, onHome, onPrevious, onNext }: AibouHeaderProps) {
  return (
    <View style={styles.row}>
      <HomeButton onPress={onHome} />
      <View style={styles.switcher}>
        <ArrowButton icon="chevron-back" label={previousLabel} onPress={onPrevious} />
        <View style={styles.name}>
          <Text style={styles.nameText} numberOfLines={1} accessibilityRole="header">{name}</Text>
        </View>
        <ArrowButton icon="chevron-forward" label={nextLabel} onPress={onNext} />
      </View>
    </View>
  );
}

function ArrowButton({ icon, label, onPress }: { icon: "chevron-back" | "chevron-forward"; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.arrow}>
      <Ionicons name={icon} size={24} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  switcher: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  nameText: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase + 4, color: colors.ink },
  arrow: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: borderWidth.bubble,
    borderColor: colors.bubbleBorder,
    backgroundColor: colors.bubbleFill,
    ...shadow.bubble,
  },
});
