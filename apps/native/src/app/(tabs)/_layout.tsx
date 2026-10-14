import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, type TextStyle, type ViewStyle } from "react-native";

import { colors, fontSize, fonts, spacing } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// expo/types の react-native-web.d.ts による interface 拡張が expo-router 側の
// react-native 型（type alias）と衝突し、tabBar*Style が見る TextStyle/ViewStyle は
// web専用プロパティのみの型になる。そのため style オブジェクトは
// (1) リテラル直接代入ではなく変数経由で渡し（過剰プロパティ検査の回避ではなく
//     weak type 判定用に共有プロパティ position を含める）、
// (2) satisfies で実際の RN 型としての妥当性は維持する。
// position: "relative" は RN のデフォルト値であり見た目への影響はない。
const tabBarLabelStyle = {
  fontFamily: fonts.bold,
  fontSize: fontSize.tab,
  position: "relative",
} satisfies TextStyle;
const tabBarStyle = {
  backgroundColor: colors.paperWhite,
  borderTopColor: colors.cottonPink,
  position: "relative",
} satisfies ViewStyle;
const headerTitleStyle = {
  fontFamily: fonts.black,
  color: colors.charcoal,
  position: "relative",
} satisfies TextStyle;

// web のボトムナビゲーションと同じ3項目に揃える。
// レポートは記録画面内のカード経由、アカウントはヘッダー右上経由。
const tabs: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: "battle", label: "Navigation.battle", icon: "flash-outline", iconActive: "flash" },
  { name: "logs", label: "Navigation.logs", icon: "calendar-outline", iconActive: "calendar" },
  { name: "collection", label: "Navigation.collection", icon: "albums-outline", iconActive: "albums" },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      initialRouteName="battle"
      screenOptions={{
        headerTitle: t("Common.headerAppNameShort"),
        headerTitleStyle: headerTitleStyle,
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Pages.account.title")}
            onPress={() => router.push("/account")}
            style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}
            hitSlop={8}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.charcoal} />
          </Pressable>
        ),
        tabBarActiveTintColor: colors.flushEdge,
        tabBarInactiveTintColor: colors.pencilGray,
        tabBarLabelStyle,
        tabBarStyle,
      }}
    >
      {tabs.map(({ name, label, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(label),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? iconActive : icon} size={size} color={color as string} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
