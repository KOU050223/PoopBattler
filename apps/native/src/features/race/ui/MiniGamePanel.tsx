import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, spacing } from "@/theme";
import { BRIDGE, DASH, HURDLE, SWIPE } from "../config";
import { ZONE_LABELS } from "../commentary";
import type { MiniGame } from "../types";
import type { MotionPlan } from "./overlay-state";
import { HURDLE_TAP_MAX_DISTANCE_M, type SwipeDir } from "./input";

/**
 * ゲージ・針・距離は shared value で受ける。ホストが毎フレーム書き、パネルは React を再描画しない（race.md 7章の8）。
 * React の props で受けるのは、矢印の並びと今の番号のように区間の中で数回しか変わらないものだけ
 */
export type MiniGamePanelView =
  | { kind: "dash"; gauge: SharedValue<number>; tapCount: SharedValue<number> }
  /** distance は次のハードルまで(m)。残りが無いときは HURDLE_TAP_MAX_DISTANCE_M より大きい値 */
  | { kind: "hurdle"; distance: SharedValue<number> }
  | { kind: "bridge"; needle: SharedValue<number> }
  | { kind: "swipe"; arrows: readonly SwipeDir[]; arrowIndex: number };

const PANEL_MAX_WIDTH = 440;
const BOTTOM_MARGIN = spacing.md;
const TRACK_HEIGHT = 16;
const CAPTION_FONT_SIZE = 12;
const PERCENT = 100;

const ARROW_GLYPHS: Record<SwipeDir, string> = { up: "↑", down: "↓", left: "←", right: "→" };
// pct・clamp01・hurdleRatio は useAnimatedStyle（UI スレッド）からも呼ぶので worklet にする
function pct(ratio: number) {
  "worklet";
  return `${ratio * PERCENT}%` as const;
}

interface Props {
  panel: MiniGamePanelView | null;
  motion: MotionPlan;
}

/** レース画面の下側に重ねる操作パネル。入力はレース画面全体で受けるので、タッチは通さない */
export function MiniGamePanel({ panel, motion }: Props) {
  const insets = useSafeAreaInsets();
  if (!panel) return null;
  const label = ZONE_LABELS[panel.kind satisfies MiniGame];
  return (
    <View pointerEvents="none" style={[styles.dock, { paddingBottom: insets.bottom + BOTTOM_MARGIN }]}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{label.name}</Text>
          <Text style={styles.verb}>{label.verb}</Text>
          {panel.kind === "dash" ? <AllOutMark gauge={panel.gauge} /> : null}
        </View>
        {panel.kind === "dash" ? <DashBody panel={panel} motion={motion} /> : null}
        {panel.kind === "hurdle" ? <HurdleBody distance={panel.distance} /> : null}
        {panel.kind === "bridge" ? <BridgeBody needle={panel.needle} /> : null}
        {panel.kind === "swipe" ? <SwipeBody arrows={panel.arrows} arrowIndex={panel.arrowIndex} /> : null}
      </View>
    </View>
  );
}

// ---- ダッシュ ----

const SCATTER_POOL = 6;
const SCATTER_RISE = 44;
const SCATTER_MS = 480;
const SCATTER_SPREAD_STEP = 14;
const SCATTER_SPREAD_SLOTS = 11;
/** 連続タップで同じ場所に重ならないよう、番号から横位置を決める素数 */
const SCATTER_STRIDE = 7;

function AllOutMark({ gauge }: { gauge: SharedValue<number> }) {
  const visible = useDerivedValue(() => withTiming(gauge.value > DASH.allOutPerf ? 1 : 0, { duration: 120 }));
  const style = useAnimatedStyle(() => ({ opacity: visible.value, transform: [{ scale: 0.9 + visible.value * 0.1 }] }));
  return <Animated.Text style={[styles.allOut, style]}>全開！</Animated.Text>;
}

function DashBody({ panel, motion }: { panel: Extract<MiniGamePanelView, { kind: "dash" }>; motion: MotionPlan }) {
  const fill = useAnimatedStyle(() => ({ width: pct(Math.min(1, Math.max(0, panel.gauge.value))) }));
  return (
    <View>
      {motion.isDashScatter ? (
        <View style={styles.scatterLayer}>
          {Array.from({ length: SCATTER_POOL }, (_, slot) => (
            <Plus key={slot} slot={slot} tapCount={panel.tapCount} />
          ))}
        </View>
      ) : null}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fill]} />
        <View style={[styles.tick, { left: pct(DASH.allOutPerf) }]} />
      </View>
    </View>
  );
}

/** 「＋」1つ。タップ数が増えるたびに、順番が回ってきた1つだけが飛ぶ */
function Plus({ slot, tapCount }: { slot: number; tapCount: SharedValue<number> }) {
  const progress = useSharedValue(1);
  const offsetX = useSharedValue(0);

  useAnimatedReaction(
    () => tapCount.value,
    (count, previous) => {
      if (previous === null || count === previous || count % SCATTER_POOL !== slot) return;
      offsetX.value = (((count * SCATTER_STRIDE) % SCATTER_SPREAD_SLOTS) - (SCATTER_SPREAD_SLOTS - 1) / 2) * SCATTER_SPREAD_STEP;
      progress.value = 0;
      progress.value = withTiming(1, { duration: SCATTER_MS, easing: Easing.out(Easing.quad) });
    },
  );

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateX: offsetX.value }, { translateY: -progress.value * SCATTER_RISE }],
  }));
  return <Animated.Text style={[styles.plus, style]}>＋</Animated.Text>;
}

// ---- ハードル ----

function clamp01(value: number) {
  "worklet";
  return Math.min(1, Math.max(0, value));
}
/** 手前の端(8m)を0、ハードルの位置を1とした横位置 */
function hurdleRatio(distance: number) {
  "worklet";
  return 1 - clamp01(distance / HURDLE_TAP_MAX_DISTANCE_M);
}
const MARKER_SIZE = 20;

function HurdleBody({ distance }: { distance: SharedValue<number> }) {
  const marker = useAnimatedStyle(() => ({ left: pct(hurdleRatio(distance.value)) }));
  const { perfect, good } = HURDLE;
  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.zone, styles.goodZone, { left: pct(hurdleRatio(good.max)), width: pct(hurdleRatio(good.min) - hurdleRatio(good.max)) }]} />
        <View style={[styles.zone, styles.perfectZone, { left: pct(hurdleRatio(perfect.max)), width: pct(hurdleRatio(perfect.min) - hurdleRatio(perfect.max)) }]} />
        <View style={styles.hurdleBar} />
        <Animated.View style={[styles.marker, marker]} />
      </View>
      <Text style={styles.caption}>濃いところでタップ</Text>
    </View>
  );
}

// ---- つり橋 ----

function BridgeBody({ needle }: { needle: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ left: pct((Math.min(1, Math.max(-1, needle.value)) + 1) / 2) }));
  // 安全域は針の座標(-1〜1)で ±safeHalfWidth。トラック全体に対する幅の割合に直す
  const safeWidthRatio = BRIDGE.safeHalfWidth;
  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.zone, styles.perfectZone, { left: pct(0.5 - safeWidthRatio / 2), width: pct(safeWidthRatio) }]} />
        <Animated.View style={[styles.needle, style]} />
      </View>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>← 左を長押し</Text>
        <Text style={styles.caption}>右を長押し →</Text>
      </View>
    </View>
  );
}

// ---- S字 ----

function SwipeBody({ arrows, arrowIndex }: { arrows: readonly SwipeDir[]; arrowIndex: number }) {
  const remaining = useSharedValue(0);
  useEffect(() => {
    remaining.value = 1;
    if (arrowIndex < arrows.length) remaining.value = withTiming(0, { duration: SWIPE.limitSec * 1000, easing: Easing.linear });
  }, [arrowIndex, arrows.length, remaining]);
  const bar = useAnimatedStyle(() => ({ width: pct(remaining.value) }));

  return (
    <View style={styles.swipeBody}>
      <View style={styles.arrowRow}>
        {arrows.map((dir, index) => (
          <View key={index} style={[styles.chip, index < arrowIndex && styles.chipDone, index === arrowIndex && styles.chipCurrent]}>
            <Text style={[styles.chipText, index === arrowIndex && styles.chipTextCurrent]}>{ARROW_GLYPHS[dir]}</Text>
          </View>
        ))}
      </View>
      <View style={styles.timeTrack}>
        <Animated.View style={[styles.timeFill, bar]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingHorizontal: spacing.lg },
  card: { width: "100%", maxWidth: PANEL_MAX_WIDTH, backgroundColor: "rgba(255,255,255,0.93)", borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  title: { fontFamily: fonts.black, fontSize: 16, color: colors.charcoal },
  verb: { fontFamily: fonts.bold, fontSize: 14, color: colors.pencilGray, flex: 1 },
  allOut: { fontFamily: fonts.black, fontSize: 16, color: colors.flushEdge },
  track: { height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: colors.blushWash, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.flushPink, borderRadius: TRACK_HEIGHT / 2 },
  tick: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: colors.flushEdge },
  scatterLayer: { position: "absolute", left: 0, right: 0, bottom: TRACK_HEIGHT, alignItems: "center" },
  plus: { position: "absolute", bottom: 0, fontFamily: fonts.black, fontSize: 20, color: colors.flushEdge },
  zone: { position: "absolute", top: 0, bottom: 0 },
  goodZone: { backgroundColor: colors.cottonPink },
  perfectZone: { backgroundColor: colors.flushPink },
  hurdleBar: { position: "absolute", right: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.charcoal },
  marker: { position: "absolute", top: (TRACK_HEIGHT - MARKER_SIZE) / 2, width: MARKER_SIZE, height: MARKER_SIZE, marginLeft: -MARKER_SIZE / 2, borderRadius: MARKER_SIZE / 2, backgroundColor: colors.sparkBlue },
  needle: { position: "absolute", top: 0, bottom: 0, width: 6, marginLeft: -3, borderRadius: 3, backgroundColor: colors.sparkBlue },
  caption: { fontFamily: fonts.bold, fontSize: CAPTION_FONT_SIZE, color: colors.pencilGray, marginTop: spacing.xs },
  captionRow: { flexDirection: "row", justifyContent: "space-between" },
  swipeBody: { gap: spacing.sm },
  arrowRow: { flexDirection: "row", justifyContent: "center", gap: spacing.md },
  chip: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.blushWash, alignItems: "center", justifyContent: "center" },
  chipDone: { opacity: 0.35 },
  chipCurrent: { backgroundColor: colors.flushPink, transform: [{ scale: 1.1 }] },
  chipText: { fontFamily: fonts.black, fontSize: 28, color: colors.flushEdge },
  chipTextCurrent: { color: colors.paperWhite },
  timeTrack: { height: 6, borderRadius: 3, backgroundColor: colors.blushWash, overflow: "hidden" },
  timeFill: { height: "100%", backgroundColor: colors.sparkBlue },
});
