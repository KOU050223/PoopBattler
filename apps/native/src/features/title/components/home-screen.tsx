import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DEFAULT_APPEARANCE, appearanceForCharacter } from "@/features/battle/poopm-appearance";
import { PoopmSprite } from "@/features/battle/components/poopm-sprite";
import toiletImage from "../../../../assets/design/home-toilet.png";
import mealImage from "../../../../assets/design/home-meal.png";
import logImage from "../../../../assets/design/home-log.png";
import { useStreak } from "@/features/streak/use-streak";
import { colors, spacing } from "@/design";
import { SceneBackground } from "@/design/kids";

import { bubbleSizes, companionSize } from "../home-layout";
import { useCompanion } from "../use-companion";
import { homePalette } from "../home-palette";
import { GearButton } from "./gear-button";
import { HomeSideTab } from "./home-side-tab";
import { IconBubble } from "./icon-bubble";
import { SpeechBubble } from "./speech-bubble";


export function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { streakDays, todayCount } = useStreak();
  const companion = useCompanion();
  const { width, height } = useWindowDimensions();
  const bubbles = bubbleSizes(width);
  const companionPx = companionSize(height, bubbles.large, insets.top + insets.bottom);

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
          <HomeSideTab
            label={name}
            value={t("NativeHome.streak", { count: streakDays })}
            icon="happy-outline"
            iconColor={colors.leaf}
            circleColor={colors.leafSoft}
          />
          <HomeSideTab
            label={t("NativeHome.today", { count: todayCount })}
            icon="calendar-outline"
            iconColor={homePalette.calendarTabIcon}
            circleColor={homePalette.calendarTabFill}
          />
        </View>
      </View>

      <View style={styles.companion}>
        <SpeechBubble message={t("NativeHome.companionMessage")} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("NativeHome.companionHint", { name })}
          onPress={() => router.push("/(tabs)/collection")}
        >
          <PoopmSprite appearance={appearance} hitKey={0} size={companionPx} />
        </Pressable>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        <IconBubble variant="large" size={bubbles.large} image={toiletImage} label={t("NativeHome.poop")} onPress={() => router.push("/(tabs)/battle")} />
        <View style={styles.subActions}>
          <IconBubble size={bubbles.small} image={mealImage} label={t("NativeHome.meal")} onPress={() => router.push("/meals")} />
          <IconBubble size={bubbles.small} image={logImage} label={t("NativeHome.log")} onPress={() => router.push("/(tabs)/logs")} />
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
