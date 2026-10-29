import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui";
import { DASH } from "@/features/race/config";
import type { MinigameEvent, Presentation } from "@/features/race/types";
import { RaceOverlay } from "@/features/race/ui/RaceOverlay";
import type { MiniGamePanelView } from "@/features/race/ui/MiniGamePanel";
import { RIVAL_LABEL_SIZE } from "@/features/race/ui/RivalLabel";
import { placeRivalLabel, type RivalLabelPlacement } from "@/features/race/ui/overlay-state";
import { useRaceHaptics } from "@/features/race/ui/use-race-haptics";
import { useRaceOverlay } from "@/features/race/ui/use-race-overlay";
import { useReducedMotion } from "@/features/sumo/ui/use-reduced-motion";
import { colors, fonts, spacing } from "@/theme";

const TOTAL_RUNNERS = 8;
const DASH_TAP_GAIN = 0.14;
const DASH_DECAY_PER_SEC = 0.45;
const HURDLE_START_M = 10;
const HURDLE_SPEED_MPS = 4;
const BRIDGE_SWING_HZ = 0.4;
const SWIPE_ARROWS = ["left", "up", "right", "down"] as const;
const CONTROLS_HEIGHT_RATIO = 0.5;
const RIVAL_NAME = "ぶりぶり";

type PanelKind = "none" | "dash" | "hurdle" | "bridge" | "swipe";

const say = (text: string, priority: 1 | 2 | 3 = 1): Presentation => ({ type: "say", text, priority });

/** レースのオーバーレイの確認用。3D もロジックもなく、ボタンで出来事を直接渡す */
export default function RaceOverlayDevScreen() {
  const insets = useSafeAreaInsets();
  const isMotionReduced = useReducedMotion();
  const { overlay, push } = useRaceOverlay();
  const play = useRaceHaptics();
  const [rank, setRank] = useState(5);
  const [panelKind, setPanelKind] = useState<PanelKind>("none");
  const [arrowIndex, setArrowIndex] = useState(0);
  const [isRivalShown, setIsRivalShown] = useState(false);

  const gauge = useSharedValue(0);
  const tapCount = useSharedValue(0);
  const hurdleDistance = useSharedValue(HURDLE_START_M);
  const needle = useSharedValue(0);
  const rivalPlacement = useSharedValue<RivalLabelPlacement>({ isVisible: false, x: 0, y: 0 });
  const elapsedSec = useSharedValue(0);

  // ホストが毎フレーム shared value を書く想定の再現。React の state は触らない
  useFrameCallback((frame) => {
    const dtSec = (frame.timeSincePreviousFrame ?? 0) / 1000;
    elapsedSec.value += dtSec;
    gauge.value = Math.max(0, gauge.value - dtSec * DASH_DECAY_PER_SEC);
    hurdleDistance.value = hurdleDistance.value > -1 ? hurdleDistance.value - dtSec * HURDLE_SPEED_MPS : HURDLE_START_M;
    needle.value = Math.sin(elapsedSec.value * Math.PI * 2 * BRIDGE_SWING_HZ) * 0.9;
    // 名札は左右にゆっくり動かす（画面端に寄せる確認のため、はみ出す位置まで振る）
    const swing = Math.sin(elapsedSec.value * 0.8);
    rivalPlacement.value = placeRivalLabel({ x: 187 + swing * 230, y: 300, isVisible: true }, { width: 375, height: 667 }, RIVAL_LABEL_SIZE);
  });

  const fire = useCallback((presentations: Presentation[]) => push(presentations, Date.now()), [push]);
  const feel = useCallback(
    (minigameEvents: MinigameEvent[]) => play({ raceEvents: [], minigameEvents }, Date.now()),
    [play],
  );

  const tapDash = () => {
    gauge.value = Math.min(1, gauge.value + DASH_TAP_GAIN);
    tapCount.value += 1;
    feel([{ type: "dashTap" }]);
  };

  const panel: MiniGamePanelView | null =
    panelKind === "dash"
      ? { kind: "dash", gauge, tapCount }
      : panelKind === "hurdle"
        ? { kind: "hurdle", distance: hurdleDistance }
        : panelKind === "bridge"
          ? { kind: "bridge", needle }
          : panelKind === "swipe"
            ? { kind: "swipe", arrows: SWIPE_ARROWS, arrowIndex }
            : null;

  const showPanel = (kind: PanelKind) => {
    setPanelKind(kind);
    setArrowIndex(0);
    hurdleDistance.value = HURDLE_START_M;
  };

  const changeRank = (next: number) => {
    const from = rank;
    setRank(next);
    fire([
      { type: "bigText", text: next === 1 ? "トップ！" : next < from ? `${next}位に浮上！` : `${next}位に後退`, isBad: next > from },
      say(next < from ? `${next}位に上がった！` : `抜かれて${next}位！`),
    ]);
  };

  return (
    <View style={styles.screen}>
      <RaceOverlay
        overlay={overlay}
        isMotionReduced={isMotionReduced}
        rank={rank}
        total={TOTAL_RUNNERS}
        panel={panel}
        rival={isRivalShown ? { name: RIVAL_NAME, placement: rivalPlacement } : null}
      />
      {/* パネルと重ならないよう、操作ボタンは画面上半分に置く。実機の本番ではここがレース画面 */}
      <ScrollView
        style={[styles.controls, { top: insets.top + 120, height: `${CONTROLS_HEIGHT_RATIO * 100}%` }]}
        contentContainerStyle={styles.controlsContent}
      >
        <Text style={styles.note}>reduce motion: {isMotionReduced ? "オン" : "オフ"}</Text>
        <View style={styles.row}>
          <Button label="実況" variant="secondary" onPress={() => fire([say("ぶりぶりがトップに立った！", 1)])} />
          <Button label="2位に浮上" variant="secondary" onPress={() => changeRank(Math.max(1, rank - 1))} />
          <Button label="後退" variant="secondary" onPress={() => changeRank(Math.min(TOTAL_RUNNERS, rank + 1))} />
        </View>
        <View style={styles.row}>
          <Button label="ゴツン！" variant="secondary" onPress={() => fire([{ type: "bigText", text: "ゴツン！", isBad: true }])} />
          <Button label="パーフェクト！" variant="secondary" onPress={() => fire([{ type: "bigText", text: "パーフェクト！", isBad: false }])} />
          <Button label="写真判定" variant="secondary" onPress={() => fire([{ type: "photoFinish" }])} />
        </View>
        <View style={styles.row}>
          <Button label="集中線 オン" variant="secondary" onPress={() => fire([{ type: "focusLines", on: true }])} />
          <Button label="オフ" variant="secondary" onPress={() => fire([{ type: "focusLines", on: false }])} />
          <Button label="シネスコ オン" variant="secondary" onPress={() => fire([{ type: "cinema", on: true }])} />
          <Button label="オフ" variant="secondary" onPress={() => fire([{ type: "cinema", on: false }])} />
        </View>
        <View style={styles.row}>
          <Button
            label="Sカットイン"
            variant="secondary"
            onPress={() => {
              fire([{ type: "cutIn", name: "うんちくん", line: "ダッシュパーフェクト！" }, { type: "bigText", text: "ダッシュ S", isBad: false }]);
              feel([{ type: "end", zone: "dash", zoneIndex: 0, grade: "S", average: 0.95 }]);
            }}
          />
          <Button label="名札" variant="secondary" onPress={() => setIsRivalShown((value) => !value)} />
        </View>
        <View style={styles.row}>
          <Button label="ダッシュ" variant="secondary" onPress={() => showPanel("dash")} />
          <Button label="ハードル" variant="secondary" onPress={() => showPanel("hurdle")} />
          <Button label="つり橋" variant="secondary" onPress={() => showPanel("bridge")} />
          <Button label="S字" variant="secondary" onPress={() => showPanel("swipe")} />
          <Button label="パネル消す" variant="secondary" onPress={() => showPanel("none")} />
        </View>
        {panelKind === "dash" ? <Button label={`連打（全開は${DASH.allOutPerf}超）`} onPress={tapDash} /> : null}
        {panelKind === "swipe" ? <Button label="次の矢印へ" onPress={() => setArrowIndex((index) => Math.min(SWIPE_ARROWS.length, index + 1))} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sparkBlue },
  controls: { position: "absolute", left: 0, right: 0 },
  controlsContent: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  note: { fontFamily: fonts.bold, fontSize: 12, color: colors.paperWhite },
});
