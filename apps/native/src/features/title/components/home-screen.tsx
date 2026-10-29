import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DEFAULT_APPEARANCE, appearanceForCharacter } from "@/features/battle/poopm-appearance";
import { PoopmSprite } from "@/features/battle/components/poopm-sprite";
import { useStreak } from "@/features/streak/use-streak";
import { spacing } from "@/design";
import { SceneBackground, SideTab } from "@/design/kids";

import { useCompanion } from "../use-companion";
import { GearButton } from "./gear-button";
import { IconBubble } from "./icon-bubble";

const COMPANION_SIZE = 240;

export function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { streakDays, todayCount } = useStreak();
  const companion = useCompanion();

  const name = companion?.name ?? t("NativeHome.fallbackCompanionName");
  const appearance = companion ? appearanceForCharacter(companion.characterId) : DEFAULT_APPEARANCE;

  return (
    <SceneBackground>
      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.gear}>
          <GearButton
            label={t("NativeHome.settings")}
            onPress={() => router.push("/parent")}
            // 開発メニューへの入口。以前のタイトル画面と同じく開発ビルドだけ。
            onLongPress={__DEV__ ? () => router.push("/dev") : undefined}
          />
        </View>
        <View style={styles.tabs}>
          <SideTab label={name} value={t("NativeHome.streak", { count: streakDays })} />
          <SideTab label={t("NativeHome.today", { count: todayCount })} />
        </View>
      </View>

      <View style={styles.companion}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("NativeHome.companionHint", { name })}
          onPress={() => router.push("/(tabs)/collection")}
        >
          <PoopmSprite appearance={appearance} hitKey={0} size={COMPANION_SIZE} />
        </Pressable>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        <IconBubble variant="large" icon="water" label={t("NativeHome.poop")} onPress={() => router.push("/(tabs)/battle")} />
        <View style={styles.subActions}>
          <IconBubble icon="restaurant" label={t("NativeHome.meal")} onPress={() => router.push("/meals")} />
          <IconBubble icon="journal" label={t("NativeHome.log")} onPress={() => router.push("/(tabs)/logs")} />
        </View>
      </View>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingLeft: spacing.lg },
  gear: { paddingTop: spacing.sm },
  tabs: { gap: spacing.sm, alignItems: "flex-end" },
  companion: { flex: 1, alignItems: "center", justifyContent: "center" },
  bottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  subActions: { flexDirection: "row", gap: spacing.md },
});
