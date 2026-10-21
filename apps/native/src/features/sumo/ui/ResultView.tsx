import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/features/records-ui";
import { colors, fonts, spacing } from "@/theme";

import type { Game } from "../types";
import { resultStatsOf } from "./hud";
import { SIDE_COLORS } from "./palette";
import { formatRecord, type SumoRecord } from "./record";
import { PLAYER_SIDE, type MatchSetup } from "./session";

const MAX_PANEL_WIDTH = 440;

/** 決着画面。勝敗・決まり手・取組の統計・通算戦績と、次の操作 */
export function ResultView({ game, setup, record, onRematch, onQuit }: {
  game: Game; setup: MatchSetup; record: SumoRecord | null; onRematch: () => void; onQuit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isWin = game.winner === PLAYER_SIDE;
  const stats = resultStatsOf(game, PLAYER_SIDE);
  const tiles = [
    { value: stats.seconds, label: "取組時間（秒）" },
    { value: String(stats.hits), label: "押した回数" },
    { value: String(stats.parries), label: "パリィ" },
  ];
  return (
    <View style={styles.overlay}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>
            {setup.playerSpecies.shikona} 対 {setup.opponentSpecies.shikona}・{setup.difficulty.name}・{setup.mode.name}モード
          </Text>
          <Text style={[styles.title, { color: isWin ? colors.flushEdge : SIDE_COLORS.west }]} accessibilityRole="header">
            {isWin ? "勝ち" : "負け"}
          </Text>
          <Text style={styles.km}>決まり手　{game.km}</Text>
          <View style={styles.stats}>
            {tiles.map((tile) => (
              <View key={tile.label} style={styles.tile}>
                <Text style={styles.tileValue}>{tile.value}</Text>
                <Text style={styles.tileLabel}>{tile.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.record}>{record ? formatRecord(record) : " "}</Text>
          <View style={styles.actions}>
            <Button label="もう一番" onPress={onRematch} />
            <Button label="力士・番付を変える" variant="secondary" onPress={onQuit} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(255,255,255,0.97)" },
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xl },
  panel: { width: "100%", maxWidth: MAX_PANEL_WIDTH, gap: spacing.lg },
  eyebrow: { fontFamily: fonts.regular, fontSize: 12, color: colors.pencilGray },
  title: { fontFamily: fonts.black, fontSize: 44, lineHeight: 52 },
  km: { fontFamily: fonts.black, fontSize: 20, color: colors.charcoal },
  stats: { flexDirection: "row", gap: spacing.sm },
  tile: { flex: 1, alignItems: "center", gap: 2, paddingVertical: spacing.sm, borderRadius: 8, backgroundColor: colors.blushWash },
  tileValue: { fontFamily: fonts.black, fontSize: 20, color: colors.charcoal, fontVariant: ["tabular-nums"] },
  tileLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.pencilGray },
  record: { fontFamily: fonts.bold, fontSize: 13, color: colors.pencilGray },
  actions: { gap: spacing.sm },
});
