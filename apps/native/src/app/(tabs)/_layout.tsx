import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { colors, fontSize, fonts } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const tabs: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: "index", label: "Navigation.battle", icon: "flash-outline", iconActive: "flash" },
  { name: "logs", label: "Navigation.logs", icon: "calendar-outline", iconActive: "calendar" },
  { name: "collection", label: "Navigation.collection", icon: "albums-outline", iconActive: "albums" },
  { name: "report", label: "Report.entryTitle", icon: "stats-chart-outline", iconActive: "stats-chart" },
  { name: "account", label: "Pages.account.title", icon: "person-outline", iconActive: "person" },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.flushEdge,
        tabBarInactiveTintColor: colors.pencilGray,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: fontSize.tab },
        tabBarStyle: { backgroundColor: colors.paperWhite, borderTopColor: colors.cottonPink },
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
