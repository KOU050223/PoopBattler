import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Button } from "@/components/ui";
import { useReducedMotion } from "@/features/sumo/ui/use-reduced-motion";
import { colors, fonts, radius, spacing } from "@/theme";

import { RaceStage3D } from "../three/RaceStage3D";
import { RaceOverlay } from "./RaceOverlay";
import { formatTime, type RaceResultView } from "./race-screen-result";
import { useRaceRun } from "./race-screen-run";
import { buildSessionOptions, DEFAULT_SETUP, seedOfClock, statsLabel, STAT_PRESETS, type RaceSetup, type SessionOptions } from "./race-screen-setup";

const KEEP_AWAKE_TAG = "race";
const MAX_PANEL_WIDTH = 440;
/** 実況の帯と順位バッジの下に、やめるボタンを置く位置（RaceOverlay の RANK_BADGE_OFFSET と同じ高さ） */
const QUIT_BUTTON_TOP = 64;
const SKY_COLOR = "#ffe0ef";

type Screen =
  | { phase: "setup" }
  | { phase: "race"; runId: number; seed: number; options: SessionOptions }
  | { phase: "result"; seed: number; result: RaceResultView };

interface RaceScreenProps {
  /** 画面を閉じる（dev メニューへ戻る） */
  onExit: () => void;
}

/** 1レースを遊べる画面。セットアップ → レース → 結果 → もう一度、を1画面の中で回す（dev 用。本編の「連戦させない」は組み込み時に扱う） */
export function RaceScreen({ onExit }: RaceScreenProps) {
  const [setup, setSetup] = useState<RaceSetup>(DEFAULT_SETUP);
  const [screen, setScreen] = useState<Screen>({ phase: "setup" });
  const [runCount, setRunCount] = useState(0);

  const start = () => {
    const seed = seedOfClock(Date.now());
    setRunCount((count) => count + 1);
    setScreen({ phase: "race", runId: runCount + 1, seed, options: buildSessionOptions(setup, seed) });
  };

  if (screen.phase === "race") {
    return (
      <RaceView
        key={screen.runId}
        options={screen.options}
        onOver={(result) => setScreen({ phase: "result", seed: screen.seed, result })}
        onQuit={() => setScreen({ phase: "setup" })}
      />
    );
  }
  if (screen.phase === "result") {
    return <ResultView result={screen.result} seed={screen.seed} onRetry={() => setScreen({ phase: "setup" })} onExit={onExit} />;
  }
  return <SetupView setup={setup} onChange={setSetup} onStart={start} onBack={onExit} />;
}

// ---- セットアップ ----

function SetupView({ setup, onChange, onStart, onBack }: { setup: RaceSetup; onChange: (setup: RaceSetup) => void; onStart: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">うんちレース</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>自分のうんちくん</Text>
            <View style={styles.presets}>
              {STAT_PRESETS.map((preset) => {
                const isSelected = preset.id === setup.presetId;
                return (
                  <Pressable
                    key={preset.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => onChange({ ...setup, presetId: preset.id })}
                    style={[styles.preset, isSelected && styles.presetSelected]}
                  >
                    <Text style={[styles.presetName, isSelected && styles.presetNameSelected]}>{preset.name}</Text>
                    <Text style={styles.presetStats}>{statsLabel(preset.stats)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.note}>体力は直線とハードル、パワーは上り坂とダッシュ、技術はS字とスワイプに効くよ。</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>ぶつかり合いあり</Text>
            <Switch
              value={setup.isCollisions}
              onValueChange={(isCollisions) => onChange({ ...setup, isCollisions })}
              trackColor={{ true: colors.flushPink, false: colors.fadedGray }}
              accessibilityLabel="ぶつかり合いあり"
            />
          </View>
          <View style={styles.guide}>
            <Text style={styles.guideLine}>ダッシュ：画面を連打</Text>
            <Text style={styles.guideLine}>ハードル：ゲージが色の部分に入ったらタップ</Text>
            <Text style={styles.guideLine}>つり橋：画面の左右を長押しして針を真ん中に</Text>
            <Text style={styles.guideLine}>S字：出てきた矢印の方向にスワイプ</Text>
          </View>
        </View>
      </ScrollView>
      {/* 親指が届く画面下に primary を置く */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.actionsInner}>
          <Button label="スタート" onPress={onStart} />
          <Button label="戻る" variant="secondary" onPress={onBack} />
        </View>
      </View>
    </View>
  );
}

// ---- レース ----

function RaceView({ options, onOver, onQuit }: { options: SessionOptions; onOver: (result: RaceResultView) => void; onQuit: () => void }) {
  const insets = useSafeAreaInsets();
  const isMotionReduced = useReducedMotion();
  const run = useRaceRun(options, onOver);

  useEffect(() => {
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch((error: unknown) => console.warn("画面の常時点灯を有効にできませんでした:", error));
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch((error: unknown) => console.warn("画面の常時点灯を解除できませんでした:", error));
    };
  }, []);

  // worklet は掴んだ値を UI スレッドへ凍結して渡す。run をそのまま掴むと raceRef・cameraRef 経由でレース状態が凍結され、
  // JS ループが毎フレーム書き換えるたびに警告が出るので、触る4つの関数だけを取り出して掴ませる
  const { onTouchDown, onTouchMove, onTouchUp, onTouchCancel } = run;
  // 判定は JS 側（input.ts）に集約し、worklet からは座標だけ渡す。レース画面全体で受けるので、パネルにはタッチを通さない
  const gesture = useMemo(
    () =>
      Gesture.Manual()
        .onTouchesDown((event, stateManager) => {
          const touch = event.changedTouches[0];
          stateManager.activate();
          scheduleOnRN(onTouchDown, touch.x, touch.y);
        })
        .onTouchesMove((event, _stateManager) => {
          const touch = event.changedTouches[0];
          scheduleOnRN(onTouchMove, touch.x, touch.y);
        })
        .onTouchesUp((event, stateManager) => {
          const touch = event.changedTouches[0];
          stateManager.end();
          scheduleOnRN(onTouchUp, touch.x, touch.y);
        })
        .onTouchesCancelled((_event, stateManager) => {
          stateManager.fail();
          scheduleOnRN(onTouchCancel);
        }),
    [onTouchDown, onTouchMove, onTouchUp, onTouchCancel],
  );

  return (
    <GestureHandlerRootView style={styles.race}>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.race}
          onLayout={(event) => run.onLayout(event.nativeEvent.layout)}
        >
          <RaceStage3D raceRef={run.raceRef} cameraRef={run.cameraRef} isReducedMotion={isMotionReduced} />
          <RaceOverlay overlay={run.overlay} isMotionReduced={isMotionReduced} rank={run.rank} total={run.total} panel={run.panel} rival={run.rival} />
        </View>
      </GestureDetector>
      {/* ジェスチャーの外に置いて、やめるボタンへのタップがレースの入力にならないようにする */}
      <View pointerEvents="box-none" style={[styles.raceCorner, { top: insets.top + QUIT_BUTTON_TOP }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="レースをやめる" onPress={onQuit} style={styles.quit}>
          <Text style={styles.quitLabel}>やめる</Text>
        </Pressable>
        <Text style={styles.seed}>seed {options.seed}</Text>
      </View>
    </GestureHandlerRootView>
  );
}

// ---- 結果 ----

const GRADE_COLORS = { S: colors.flushEdge, A: colors.sparkBlue, B: colors.pencilGray, C: colors.fadedGray } as const;

function ResultView({ result, seed, onRetry, onExit }: { result: RaceResultView; seed: number; onRetry: () => void; onExit: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <View style={styles.resultHead}>
            <Text style={[styles.resultTitle, result.playerPlace === 1 && styles.resultTitleFirst]} accessibilityRole="header">{result.title}</Text>
            <Text style={styles.resultSub}>{result.subtitle}</Text>
          </View>
          <View style={styles.card}>
            {result.rows.map((row) => (
              <View key={row.place} style={[styles.row, row.isPlayer && styles.rowPlayer]}>
                <Text style={styles.rowPlace}>{row.place}着</Text>
                <View style={styles.rowName}>
                  <Text style={[styles.rowNameText, row.isPlayer && styles.rowNameTextPlayer]} numberOfLines={1}>{row.name}</Text>
                  <Text style={styles.rowStats}>{row.statsText}</Text>
                </View>
                <Text style={styles.rowTime}>
                  {row.isEstimated ? "予想 " : ""}
                  {row.place === 1 ? formatTime(row.timeSec) : `+${formatTime(row.gapSec)}`}
                </Text>
              </View>
            ))}
          </View>
          {result.zoneGrades.length > 0 ? (
            <View style={styles.grades}>
              {result.zoneGrades.map((entry, index) => (
                <View key={index} style={styles.grade}>
                  <Text style={styles.gradeName}>{entry.name}</Text>
                  <Text style={[styles.gradeValue, { color: GRADE_COLORS[entry.grade] }]}>{entry.grade}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.highlights}>
            {result.highlights.map((text) => (
              <Text key={text} style={styles.highlight}>{text}</Text>
            ))}
          </View>
          <Text style={styles.seedNote}>seed {seed}</Text>
        </View>
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.actionsInner}>
          <Button label="もう一度" onPress={onRetry} />
          <Button label="戻る" variant="secondary" onPress={onExit} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { alignItems: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  panel: { width: "100%", maxWidth: MAX_PANEL_WIDTH, gap: spacing.lg },
  title: { fontFamily: fonts.black, fontSize: 28, color: colors.charcoal },
  field: { gap: spacing.sm },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.pencilGray },
  presets: { gap: spacing.sm },
  preset: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.paperWhite, borderWidth: 1, borderColor: colors.cottonPink },
  presetSelected: { borderColor: colors.flushEdge, backgroundColor: colors.blushWash },
  presetName: { fontFamily: fonts.bold, fontSize: 16, color: colors.charcoal },
  presetNameSelected: { color: colors.flushEdge },
  presetStats: { fontFamily: fonts.regular, fontSize: 13, color: colors.pencilGray },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.pencilGray },
  toggleRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.paperWhite },
  toggleLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.charcoal },
  guide: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.paperWhite },
  guideLine: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.pencilGray },
  actions: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.sm, backgroundColor: colors.background },
  actionsInner: { width: "100%", maxWidth: MAX_PANEL_WIDTH, gap: spacing.sm },

  race: { flex: 1, backgroundColor: SKY_COLOR },
  raceCorner: { position: "absolute", right: spacing.lg, alignItems: "flex-end", gap: spacing.xs },
  quit: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: 18, justifyContent: "center", backgroundColor: colors.paperWhite, borderWidth: 1, borderColor: colors.cottonPink },
  quitLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.charcoal },
  seed: { fontFamily: fonts.regular, fontSize: 10, color: colors.pencilGray },

  resultHead: { gap: spacing.xs },
  resultTitle: { fontFamily: fonts.black, fontSize: 32, color: colors.charcoal },
  resultTitleFirst: { color: colors.flushEdge },
  resultSub: { fontFamily: fonts.bold, fontSize: 14, color: colors.pencilGray },
  card: { borderRadius: radius.lg, backgroundColor: colors.paperWhite, paddingVertical: spacing.xs },
  row: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  rowPlayer: { backgroundColor: colors.blushWash },
  rowPlace: { width: 36, fontFamily: fonts.black, fontSize: 14, color: colors.pencilGray },
  rowName: { flex: 1 },
  rowNameText: { fontFamily: fonts.bold, fontSize: 15, color: colors.charcoal },
  rowNameTextPlayer: { color: colors.flushEdge },
  rowStats: { fontFamily: fonts.regular, fontSize: 11, color: colors.pencilGray },
  rowTime: { fontFamily: fonts.bold, fontSize: 14, color: colors.charcoal },
  grades: { flexDirection: "row", gap: spacing.sm },
  grade: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.paperWhite },
  gradeName: { fontFamily: fonts.bold, fontSize: 12, color: colors.pencilGray },
  gradeValue: { fontFamily: fonts.black, fontSize: 24 },
  highlights: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  highlight: { fontFamily: fonts.bold, fontSize: 12, color: colors.charcoal, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 14, backgroundColor: colors.paperWhite },
  seedNote: { fontFamily: fonts.regular, fontSize: 10, color: colors.pencilGray },
});
