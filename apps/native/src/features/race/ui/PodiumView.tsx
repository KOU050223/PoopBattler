import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui";
import { useReducedMotion } from "@/features/sumo/ui/use-reduced-motion";
import { colors, fonts, radius, spacing } from "@/theme";

import { PodiumStage3D, PODIUM_PLACES_LEFT_TO_RIGHT } from "../three/PodiumStage3D";
import { buildPodium, type RaceResultView, type ResultRow } from "./race-screen-result";

const MAX_PANEL_WIDTH = 440;
const RISE_MS = 450;
/** 下位の台から順に立ち上げる間隔。1位が最後に出て締めになる */
const STAGGER_MS = 500;
/** 全部の台が立ち上がり切ってから、操作ボタンを出すまでの余白 */
const BUTTON_GRACE_MS = 500;

/** 3D の高さ。表彰台と上に立つうんちくんが入る */
const STAGE_HEIGHT = 300;

interface PodiumViewProps {
  result: RaceResultView;
  onContinue: () => void;
}

/** レース後の表彰画面。タップでいつでも飛ばせる（毎回見る画面なので長く拘束しない） */
export function PodiumView({ result, onContinue }: PodiumViewProps) {
  const insets = useSafeAreaInsets();
  const isReduced = useReducedMotion();
  const { winners, outsidePlayer } = buildPodium(result);
  const revealMs = (winners.length - 1) * STAGGER_MS + RISE_MS + BUTTON_GRACE_MS;
  const [isButtonShown, setIsButtonShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsButtonShown(true), isReduced ? 0 : revealMs);
    return () => clearTimeout(timer);
  }, [isReduced, revealMs]);

  const entries = winners.map((row) => ({ place: row.place, runnerIndex: row.runnerIndex, delaySec: ((winners.length - row.place) * STAGGER_MS) / 1000 }));
  const rowsLeftToRight = PODIUM_PLACES_LEFT_TO_RIGHT.map((place) => winners.find((row) => row.place === place));

  return (
    <Pressable style={styles.page} onPress={onContinue} accessibilityLabel="表彰をスキップ" accessibilityHint="タップすると結果の詳細へ進みます">
      <View style={[styles.body, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.panel}>
          <Text style={styles.heading} accessibilityRole="header">{result.title}</Text>
          {/* 触りはすべて親の Pressable に渡す（Canvas が押下を奪うとスキップできない） */}
          <View pointerEvents="none">
            <PodiumStage3D entries={entries} riseSec={RISE_MS / 1000} isReducedMotion={isReduced} height={STAGE_HEIGHT} />
            <View style={styles.names}>
              {rowsLeftToRight.map((row, index) => (row ? <PodiumName key={row.place} row={row} appearIndex={winners.length - row.place} isReduced={isReduced} /> : <View key={index} style={styles.nameSlot} />))}
            </View>
          </View>
          {outsidePlayer ? (
            <View style={styles.outside}>
              <Text style={styles.outsidePlace}>{outsidePlayer.place}着</Text>
              <Text style={styles.outsideName} numberOfLines={1}>{outsidePlayer.name}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.actionsInner}>
          {isButtonShown ? <Button label="けっかをみる" onPress={onContinue} /> : <Text style={styles.skipHint}>タップでスキップ</Text>}
        </View>
      </View>
    </Pressable>
  );
}

function PodiumName({ row, appearIndex, isReduced }: { row: ResultRow; appearIndex: number; isReduced: boolean }) {
  const opacity = useSharedValue(isReduced ? 1 : 0);

  useEffect(() => {
    opacity.value = isReduced ? 1 : withDelay(appearIndex * STAGGER_MS, withTiming(1, { duration: RISE_MS }));
  }, [appearIndex, isReduced, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.nameSlot, style]}>
      <Text style={styles.place}>{row.place}位</Text>
      <Text style={[styles.name, row.isPlayer && styles.namePlayer]} numberOfLines={1}>{row.name}</Text>
      {row.isPlayer ? <Text style={styles.you}>あなた</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xl },
  panel: { width: "100%", maxWidth: MAX_PANEL_WIDTH, gap: spacing.xl },
  heading: { fontFamily: fonts.black, fontSize: 32, color: colors.flushEdge, textAlign: "center" },
  names: { flexDirection: "row" },
  nameSlot: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xs, gap: 2 },
  place: { fontFamily: fonts.black, fontSize: 20, color: colors.flushEdge },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.charcoal },
  namePlayer: { color: colors.flushEdge },
  you: { fontFamily: fonts.bold, fontSize: 11, color: colors.flushEdge },
  outside: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.paperWhite, borderWidth: 2, borderColor: colors.flushEdge },
  outsidePlace: { fontFamily: fonts.black, fontSize: 18, color: colors.flushEdge },
  outsideName: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.charcoal },
  actions: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  actionsInner: { width: "100%", maxWidth: MAX_PANEL_WIDTH, minHeight: 52, justifyContent: "center" },
  skipHint: { textAlign: "center", fontFamily: fonts.regular, fontSize: 12, color: colors.pencilGray },
});
