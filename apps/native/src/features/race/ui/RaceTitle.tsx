import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { PoopmSprite } from "@/features/battle/components/poopm-sprite";
import { DEFAULT_APPEARANCE, appearanceForCharacter } from "@/features/battle/poopm-appearance";
import { IconBubble } from "@/features/title/components/icon-bubble";
import { SpeechBubble } from "@/features/title/components/speech-bubble";
import { bubbleSizes, companionSize } from "@/features/title/home-layout";
import { useCompanion } from "@/features/title/use-companion";
import { borderWidth, colors, radius, shadow, spacing } from "@/design";
import { usePressSpring } from "@/design/kids/use-press-spring";

import backgroundImage from "../../../../assets/design/race-title-bg.jpg";
import toiletImage from "../../../../assets/design/home-toilet.png";

const BACK_BUTTON_SIZE = 52;
/** 右上の補助の泡は、主役のレースより一回り小さくする */
const SIDE_BUBBLE_RATIO = 0.8;
const MAX_CENTER_COMPANION_SIZE = 200;

interface RaceTitleProps {
  isStarting: boolean;
  errorMessage: string | null;
  onStart: () => void;
  onSkip: () => void;
  onBack: () => void;
}

/** 本編レースのタイトル。ホームと同じ「相棒 + 下に泡3つ」の作りで、レースを遊ぶ・遊ばない・あそびかたを選ぶ */
export function RaceTitle({ isStarting, errorMessage, onStart, onSkip, onBack }: RaceTitleProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const companion = useCompanion();
  const bubbles = bubbleSizes(width);
  const sideSize = Math.round(bubbles.small * SIDE_BUBBLE_RATIO);
  // 中央の列は 吹き出し・相棒・大きい泡 を縦に積むので、泡の分だけ相棒を縮める
  const companionPx = Math.min(companionSize(height, bubbles.large, insets.top + insets.bottom), MAX_CENTER_COMPANION_SIZE);
  const appearance = companion ? appearanceForCharacter(companion.characterId) : DEFAULT_APPEARANCE;
  // 通信中は二重に押せないようにする。泡は disabled を持たないので、押されても何もしない関数にする
  const ignoreWhileStarting = (action: () => void) => () => {
    if (!isStarting) action();
  };

  return (
    <View style={styles.root}>
      {/* 画像の縦横比は端末ごとに違うので、cover で全面に敷いて端は切る */}
      <Image source={backgroundImage} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />

      <View style={[styles.topActions, { paddingTop: insets.top + spacing.md }]}>
        <BackButton label={t("Battle.raceBackLabel")} onPress={onBack} />
      </View>

      <View style={styles.center}>
        <SpeechBubble message={errorMessage ?? t("Battle.raceCompanionMessage")} />
        <PoopmSprite appearance={appearance} hitKey={0} size={companionPx} />
      </View>

      {/* ホームと見分けがつくよう、レースは画面の中央の下に置き、左下にスキップを置く。親指が届く画面下にまとめる */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        <IconBubble variant="large" size={bubbles.large} image={toiletImage} label={isStarting ? t("Battle.loading") : t("Battle.raceStartShort")} onPress={ignoreWhileStarting(onStart)} />
        <View style={[styles.cornerSlot, { left: spacing.lg, bottom: insets.bottom + spacing.md }]}>
          <IconBubble size={sideSize} iconName="play-skip-forward" label={t("Battle.raceSkipShort")} onPress={ignoreWhileStarting(onSkip)} />
        </View>
      </View>
    </View>
  );
}

// GearButton と同じ見た目の丸い泡。戻る操作なので矢印にする
function BackButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.back, animatedStyle]}>
        <Ionicons name="chevron-back" size={28} color={colors.ink} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.skySoft },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  topActions: { alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.lg },
  bottom: { alignItems: "center" },
  cornerSlot: { position: "absolute" },
  back: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: borderWidth.bubble,
    borderColor: colors.bubbleBorder,
    backgroundColor: colors.bubbleFill,
    ...shadow.bubble,
  },
});
