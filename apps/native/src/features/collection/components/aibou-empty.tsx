import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/design";
import { BubbleButton } from "@/design/kids";

type AibouEmptyProps = { title: string; hint?: string; actionLabel: string; isError?: boolean; onAction: () => void };

// 景色の上に直接文字を置くと絵と重なって読めないので、白い板に載せる。
export function AibouEmpty({ title, hint, actionLabel, isError = false, onAction }: AibouEmptyProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.panel}>
        <Text style={styles.title} accessibilityRole={isError ? "alert" : "header"}>{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <BubbleButton label={actionLabel} onPress={onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  panel: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.sheet,
    backgroundColor: colors.paper,
  },
  title: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.ink, textAlign: "center" },
  hint: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childBase, color: colors.ink, textAlign: "center" },
});
