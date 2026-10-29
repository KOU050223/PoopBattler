import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/design";
import { SideTab } from "@/design/kids";

const ICON_CIRCLE = 40;

type HomeSideTabProps = {
  label: string;
  value?: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  circleColor: string;
};

// SideTab は絵を持てないので、左に丸いアイコンを並べて同じ紙色の帯に見せる。
export function HomeSideTab({ label, value, icon, iconColor, circleColor }: HomeSideTabProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.circle, { backgroundColor: circleColor }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <SideTab label={label} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.sm,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.pill,
    borderBottomLeftRadius: radius.pill,
  },
  circle: { width: ICON_CIRCLE, height: ICON_CIRCLE, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
