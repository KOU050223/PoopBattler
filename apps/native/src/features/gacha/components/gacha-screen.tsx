import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fontFamily, fontSize, spacing } from "@/design";
import { BubbleButton, SceneBackground } from "@/design/kids";
import { DEFAULT_APPEARANCE, appearanceForCharacter } from "@/features/battle/poopm-appearance";
import { Poopm3DGacha } from "@/features/poopm-3d/components/poopm-3d-gacha";
import { useReduceMotion } from "@/features/poopm-3d/use-reduce-motion";

import type { GachaItem } from "../gacha-pool";
import { DUPLICATE_REFUND, PULL_COST } from "../gacha-state";
import { useGacha } from "../use-gacha";
import { Confetti } from "./confetti";
import { ToiletFlush } from "./toilet-flush";

type Phase = "idle" | "flushing" | "revealed";
type Reveal = { item: GachaItem; isDuplicate: boolean };

const MAX_CONTENT_WIDTH = 420;
const REVEAL_RATIO = 0.8;
const FLASH_PEAK_OPACITY = 0.9;
const FLASH_MS = 380;

export function GachaScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const { state, isReady, pull } = useGacha();
  const [phase, setPhase] = useState<Phase>("idle");
  const [reveal, setReveal] = useState<Reveal>();
  // 「もういっかい」で再演出するたびに紙吹雪を最初から降らせ直すためのキー。
  const [pullCount, setPullCount] = useState(0);
  const [isShortOfStones, setIsShortOfStones] = useState(false);

  const stageSize = Math.min(width, MAX_CONTENT_WIDTH);
  const flash = useRef(new Animated.Value(0)).current;
  const canFlush = isReady && phase !== "flushing";

  const onFlush = useCallback(async () => {
    setIsShortOfStones(false);
    const result = await pull();
    if (result.status === "insufficient") {
      setIsShortOfStones(true);
      return;
    }
    setReveal({ item: result.item, isDuplicate: result.isDuplicate });
    setPullCount((count) => count + 1);
    setPhase("flushing");
  }, [pull]);

  // 「デン！」: 白くフラッシュさせ、強く振動させる。
  const onSlam = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (reduceMotion) return;
    flash.setValue(FLASH_PEAK_OPACITY);
    Animated.timing(flash, { toValue: 0, duration: FLASH_MS, useNativeDriver: true }).start();
  }, [flash, reduceMotion]);

  const onFlushed = useCallback(() => {
    setPhase("revealed");
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  return (
    <SceneBackground>
      <View style={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Gacha.title")}</Text>
          <Text style={styles.stones}>{t("Gacha.stones", { count: state.stones })}</Text>
        </View>

        <View style={styles.stage}>
          {phase === "revealed" && reveal ? (
            <RevealView reveal={reveal} reduceMotion={reduceMotion} size={stageSize * REVEAL_RATIO} />
          ) : (
            <ToiletFlush
              size={stageSize}
              isFlushing={phase === "flushing"}
              reduceMotion={reduceMotion}
              onSlam={onSlam}
              onFlushed={onFlushed}
            />
          )}
          {phase === "flushing" ? <Text style={styles.note}>{t("Gacha.flushing")}</Text> : null}
          {isShortOfStones ? <Text style={styles.warning}>{t("Gacha.noStones")}</Text> : null}
        </View>

        <View style={styles.actions}>
          {phase !== "flushing" ? (
            <BubbleButton
              variant="large"
              label={phase === "revealed" ? t("Gacha.again") : t("Gacha.flush")}
              onPress={() => (canFlush ? void onFlush() : undefined)}
            />
          ) : null}
          <Text style={styles.note}>{t("Gacha.cost", { count: PULL_COST })}</Text>
          <BubbleButton label={t("Gacha.close")} onPress={() => router.back()} />
        </View>
      </View>
      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
      {phase === "revealed" && !reduceMotion ? <Confetti key={pullCount} /> : null}
    </SceneBackground>
  );
}

function RevealView({ reveal, reduceMotion, size }: { reveal: Reveal; reduceMotion: boolean; size: number }) {
  const { t } = useTranslation();
  const { item, isDuplicate } = reveal;
  const appearance = item.kind === "poopm" ? appearanceForCharacter(item.characterId) : { ...DEFAULT_APPEARANCE, head: item.head };
  const name =
    item.kind === "poopm"
      ? t(`Gacha.poopmNames.${item.characterId}`)
      : t("Gacha.headName", { label: item.head.replace("hat-", "").toUpperCase() });

  return (
    <View style={styles.reveal}>
      <Text style={styles.revealHeading}>{item.kind === "poopm" ? t("Gacha.gotPoopm") : t("Gacha.gotHead")}</Text>
      <View style={{ width: size, height: size }}>
        <Poopm3DGacha appearance={appearance} reduceMotion={reduceMotion} />
      </View>
      <Text style={styles.revealName}>{name}</Text>
      {isDuplicate ? <Text style={styles.note}>{t("Gacha.duplicate", { count: DUPLICATE_REFUND })}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", paddingHorizontal: spacing.lg, maxWidth: MAX_CONTENT_WIDTH, width: "100%", alignSelf: "center" },
  header: { alignItems: "center", gap: spacing.xs },
  title: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childTitle, color: colors.ink },
  stones: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.goldEdge },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  actions: { alignItems: "center", gap: spacing.md },
  note: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.childMin, color: colors.inkSoft, textAlign: "center" },
  warning: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childMin, color: colors.ink, textAlign: "center" },
  flash: { ...StyleSheet.absoluteFill, backgroundColor: colors.paper },
  reveal: { alignItems: "center", gap: spacing.sm },
  revealHeading: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.goldEdge },
  revealName: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childTitle, color: colors.ink },
});
