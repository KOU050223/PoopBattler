import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DEFAULT_APPEARANCE, appearanceForCharacter } from "@/features/battle/poopm-appearance";
import toiletImage from "../../../../assets/design/home-toilet.png";
import mealImage from "../../../../assets/design/home-meal.png";
import logImage from "../../../../assets/design/home-log.png";
import gachaImage from "../../../../assets/design/home-gacha.png";
import { useStoneClaim } from "@/features/gacha/use-stone-claim";
import { useStreak } from "@/features/streak/use-streak";
import { colors, fontFamily, fontSize, radius, spacing } from "@/design";
import { SceneBackground } from "@/design/kids";

import { bubbleSizes, companionSize, gachaBubbleSize } from "../home-layout";
import { useCompanion } from "../use-companion";
import { homePalette } from "../home-palette";
import { HomeCompanion } from "./home-companion";
import { HomeHalo } from "./home-halo";
import { GearButton } from "./gear-button";
import { HomeSideTab } from "./home-side-tab";
import { IconBubble } from "./icon-bubble";
import { SpeechBubble } from "./speech-bubble";
import { StoneGain } from "./stone-gain";


export function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { streakDays, todayCount } = useStreak();
  const companion = useCompanion();
  const { stones, gained, acknowledge } = useStoneClaim();
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
          <IconBubble size={gachaBubbleSize(bubbles.small)} image={gachaImage} label={t("Gacha.open")} onPress={() => router.push("/gacha")} />
          <View style={styles.stoneCount}>
            <Text style={styles.stoneCountText}>{t("Gacha.stones", { count: stones })}</Text>
          </View>
        </View>
        <View style={styles.tabs}>
          <HomeSideTab
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
        <View style={styles.speech}>
          <SpeechBubble message={t("NativeHome.companionMessage")} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("NativeHome.companionHint", { name })}
          onPress={() => router.push("/(tabs)/collection")}
        >
          <HomeCompanion appearance={appearance} size={companionPx} />
        </Pressable>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        <HomeHalo windowWidth={width} largeBubbleSize={bubbles.large} />
        <IconBubble variant="large" size={bubbles.large} image={toiletImage} label={t("NativeHome.poop")} onPress={() => router.push("/(tabs)/battle")} />
        <View style={styles.subActions}>
          <IconBubble size={bubbles.small} image={mealImage} label={t("NativeHome.meal")} onPress={() => router.push("/meals")} />
          <IconBubble size={bubbles.small} image={logImage} label={t("NativeHome.log")} onPress={() => router.push("/(tabs)/logs")} />
        </View>
      </View>
      {gained > 0 ? <StoneGain count={gained} label={t("NativeHome.stoneGain", { count: gained })} onDone={acknowledge} /> : null}
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingLeft: spacing.lg },
  // 下の泡の列は3つで幅がいっぱいなので、ガチャは歯車の下に置く。
  gear: { paddingTop: spacing.sm, gap: spacing.md, alignItems: "flex-start" },
  stoneCount: { alignSelf: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.paper },
  stoneCountText: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.ink },
  tabs: { gap: spacing.sm, alignItems: "flex-end" },
  companion: { flex: 1, alignItems: "center", justifyContent: "center" },
  // 左上のガチャ・いしのラベルと被らないよう、吹き出しは右へ寄せる。
  speech: { alignSelf: "flex-end", paddingRight: spacing.lg },
  bottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  subActions: { flexDirection: "row", gap: spacing.md },
});
