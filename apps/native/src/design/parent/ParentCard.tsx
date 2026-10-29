import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { borderWidth, colors, radius } from "../tokens";

// 厚みや影をつけないのが親の画面の面。ListRow を並べるときの角丸クリップもここで持つ。
export function ParentCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderWidth: borderWidth.line,
    borderColor: colors.line,
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
