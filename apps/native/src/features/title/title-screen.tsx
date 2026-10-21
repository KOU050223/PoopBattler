import { Accelerometer } from "expo-sensors";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui";
import { colors, fontSize, fonts, spacing } from "@/theme";

import { POOPM_APPEARANCES } from "../battle/poopm-appearance";
import { PoopmSprite } from "../battle/components/poopm-sprite";

const LOGO = require("../../../../web/public/assets/buryulaid-logo.png");

const SHAKE_GRAVITY_DELTA = 1.8;
const GRAVITY_MAGNITUDE = 9.80665;
const SHAKE_COOLDOWN_MS = 260;
const MAX_FALLING = 5;
const CHARACTER_IDS = ["curry-poop", "vegetable-poop", "spicy-poop"] as const;

type Falling = { id: number; characterId: (typeof CHARACTER_IDS)[number]; left: number; tilt: number; distance: number };

function FallingPoopm({ drop }: { drop: Falling }) {
  const fall = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fall, {
      toValue: 1,
      duration: 900,
      easing: Easing.bounce,
      useNativeDriver: true,
    }).start();
  }, [fall]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-160, drop.distance] });
  const rotate = `${drop.tilt}deg`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.falling, { left: `${drop.left}%`, transform: [{ translateY }, { rotate }] }]}
    >
      <PoopmSprite appearance={POOPM_APPEARANCES[drop.characterId]} hitKey={0} size={72} />
    </Animated.View>
  );
}

/**
 * web の `/` タイトル画面に対応する画面。ロゴ + 「はじめる」+ シェイク演出。
 * シェイク検出は expo-sensors の加速度（重力込み）で、web の isTitleShake と
 * 同じ「静止時の重力からのズレ」判定に寄せる。効果音は web の /poop_voice/*.mp3 を
 * 使うが、native 側の音声基盤は未導入のため視覚演出のみ。
 */
export function TitleScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [falling, setFalling] = useState<Falling[]>([]);
  const [found, setFound] = useState(false);
  const lastShakeAt = useRef(0);
  const nextId = useRef(0);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
  }, []);

  const reveal = useCallback(() => {
    if (reduceMotionRef.current) return;
    const now = Date.now();
    if (now - lastShakeAt.current < SHAKE_COOLDOWN_MS) return;
    lastShakeAt.current = now;
    nextId.current += 1;
    const drop: Falling = {
      id: nextId.current,
      characterId: CHARACTER_IDS[nextId.current % CHARACTER_IDS.length],
      left: 4 + Math.random() * 82,
      tilt: -12 + Math.random() * 24,
      distance: height * 0.45 + Math.random() * height * 0.35,
    };
    setFalling((current) => [...current.slice(-(MAX_FALLING - 1)), drop]);
    setFound(true);
  }, [height]);

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (Math.abs(magnitude - GRAVITY_MAGNITUDE) >= SHAKE_GRAVITY_DELTA) reveal();
    });
    return () => sub.remove();
  }, [reveal]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.center}>
        <Image
          source={LOGO}
          // % 幅 + aspectRatio は Android で未適用になるため、画面幅から数値で確定させる。
          style={[styles.logo, { width: Math.min(width * 0.86, 480), height: Math.min(width * 0.86, 480) * (1024 / 1536) }]}
          resizeMode="contain"
          accessibilityLabel={t("Home.gameTitle")}
        />
        <Text style={styles.tagline}>{t("Home.tagline")}</Text>
        <Text style={styles.supporting}>{t("Home.supportingCopy")}</Text>
        <View style={styles.cta}>
          <Button label={t("Home.start")} onPress={() => router.push("/battle")} />
        </View>
        <View style={styles.shakeRow}>
          <Button label={t("Home.shakePreview")} variant="secondary" onPress={reveal} />
        </View>
        <Text style={styles.hint}>{found ? t("Home.shakeFound") : t("Home.shakeHint")}</Text>
        {__DEV__ ? (
          <Text style={styles.devLink} onPress={() => router.push("/dev")}>
            開発メニュー
          </Text>
        ) : null}
      </View>
      {falling.map((drop) => (
        <FallingPoopm key={drop.id} drop={drop} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blushWash, overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  logo: { marginBottom: spacing.lg },
  tagline: { fontFamily: fonts.black, fontSize: fontSize.title, color: colors.charcoal, textAlign: "center" },
  supporting: { fontFamily: fonts.regular, fontSize: fontSize.body, lineHeight: 22, color: colors.pencilGray, textAlign: "center" },
  cta: { alignSelf: "stretch", marginTop: spacing.xl },
  shakeRow: { marginTop: spacing.md },
  hint: { marginTop: spacing.sm, fontFamily: fonts.regular, fontSize: 13, color: colors.pencilGray },
  devLink: { marginTop: spacing.lg, fontFamily: fonts.regular, fontSize: 12, color: colors.pencilGray, textDecorationLine: "underline" },
  falling: { position: "absolute", top: 0 },
});
