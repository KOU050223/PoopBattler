// 対戦画面の HUD 部品。値の決め方は hud.ts（純関数）にあり、ここは並べて描くだけ。
// 試作（うんちくん相撲 実験版）の構成：上＝西の名札＋土俵位置バー、下＝東の名札＋必殺ボタン、
// 画面下中央に守りの扇、両端に息チューブ。土俵の中央には何も置かない。
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";

import { colors, fonts, spacing } from "@/theme";

import { FAVORITE_NAMES } from "../config";
import type { Species } from "../types";
import {
  edgeZones,
  fanGeometry,
  fanLabelPoint,
  fanPath,
  ghostDrainMs,
  isStaminaLow,
  isSpecialReady,
  positionPercent,
  specialRatio,
  staminaTone,
  type ClinchHud,
  type FanState,
  type Telegraph,
} from "./hud";
import { DIR_LEFT, DIR_RIGHT, type SideDir } from "./input";
import { CONTROL_HINTS, SPECIES_SHORT_NAMES } from "./labels";
import { fanColors } from "./fan-colors";
import { HEAT_COLOR, POP_COLORS, SIDE_COLORS, SPECIAL_COLOR, STAMINA_COLORS, TELEGRAPH_COLORS } from "./palette";
import { sideName, type Pop } from "./pop";

/** ボタン類は画面全体のジェスチャー（守り・突き）を始めさせない */
export const stopGesture = (event: GestureResponderEvent): void => event.stopPropagation();

// ---- 名札 ----

export function NamePlate({ side, species, caption, hasSpecial, special, trailing }: {
  side: "east" | "west";
  species: Species;
  /** 種族・得意など、名前の横に小さく出す説明 */
  caption: string;
  hasSpecial: boolean;
  special: number;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.plate}>
      <View style={styles.plateRow}>
        <Text style={[styles.plateSide, { color: SIDE_COLORS[side] }]}>{sideName(side === "east" ? 0 : 1)}</Text>
        <Text style={styles.plateName} numberOfLines={1}>{species.shikona}</Text>
        <Text style={styles.plateCaption} numberOfLines={1}>{caption}</Text>
        {trailing}
      </View>
      {hasSpecial ? (
        <View style={styles.plateBarRow}>
          <Text style={styles.plateBarLabel}>必殺</Text>
          <View style={styles.plateBarTrack}>
            <View style={[styles.plateBarFill, { width: `${specialRatio(special) * 100}%` }]} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export const captionOf = (species: Species, ...extras: string[]): string =>
  [SPECIES_SHORT_NAMES[species.id] ?? species.kind, `得意 ${FAVORITE_NAMES[species.fav]}`, ...extras].join("・");

export function QuitButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="やめる" hitSlop={8} onPress={onPress} onTouchStart={stopGesture} style={styles.quit}>
      <Text style={styles.quitLabel}>やめる</Text>
    </Pressable>
  );
}

// ---- 土俵位置バー ----

export function PositionBar({ position }: { position: number }) {
  const zones = edgeZones();
  return (
    <View style={styles.ring}>
      <Text style={[styles.ringLabel, { color: SIDE_COLORS.east }]}>東の便器</Text>
      <View style={styles.ringTrackWrap}>
        <View style={styles.ringTrack}>
          <View style={[styles.ringEnd, { left: 0, backgroundColor: SIDE_COLORS.east }]} />
          <View style={[styles.ringEnd, { right: 0, backgroundColor: SIDE_COLORS.west }]} />
          <View style={[styles.ringEdge, { left: `${zones.east.left}%`, width: `${zones.east.width}%` }]} />
          <View style={[styles.ringEdge, { left: `${zones.west.left}%`, width: `${zones.west.width}%` }]} />
        </View>
        <View style={[styles.ringMarker, { left: `${positionPercent(position)}%` }]} />
      </View>
      <Text style={[styles.ringLabel, { color: SIDE_COLORS.west }]}>西の便器</Text>
    </View>
  );
}

// ---- 息チューブ ----

const TUBE_TICKS = [20, 40, 60, 80] as const;

export function StaminaTube({ stamina, side, isMotionReduced }: { stamina: number; side: "east" | "west"; isMotionReduced: boolean }) {
  const ghost = useRef(new Animated.Value(stamina)).current;
  const ghostValue = useRef(stamina);
  const blink = useRef(new Animated.Value(1)).current;
  const isLow = isStaminaLow(stamina);

  useEffect(() => {
    ghost.stopAnimation();
    const duration = ghostDrainMs(ghostValue.current, stamina);
    if (duration === 0) {
      ghostValue.current = stamina;
      ghost.setValue(stamina);
      return;
    }
    // 減った分だけ白い残像を後から追わせる。増えたときは即座に追いつかせる
    Animated.timing(ghost, { toValue: stamina, duration, easing: Easing.linear, useNativeDriver: false }).start(() => {
      ghostValue.current = stamina;
    });
  }, [stamina, ghost]);

  useEffect(() => {
    if (!isLow || isMotionReduced) {
      blink.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 250, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isLow, isMotionReduced, blink]);

  const percent = (value: Animated.Value) => value.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"], extrapolate: "clamp" });
  return (
    <View style={styles.stamina} accessible accessibilityLabel={`${sideName(side === "east" ? 0 : 1)}の息 ${stamina}`}>
      <Text style={styles.staminaLabel}>息</Text>
      <View style={[styles.tube, { borderColor: SIDE_COLORS[side] }]}>
        <Animated.View style={[styles.tubeFill, styles.tubeGhost, { height: percent(ghost) }]} />
        <View style={[styles.tubeFill, { height: `${stamina}%`, backgroundColor: STAMINA_COLORS[staminaTone(stamina)] }]} />
        {TUBE_TICKS.map((tick) => (
          <View key={tick} style={[styles.tubeTick, { bottom: `${tick}%` }]} />
        ))}
      </View>
      <Animated.Text style={[styles.staminaWarn, { opacity: isLow ? blink : 0 }]}>息切れ</Animated.Text>
    </View>
  );
}

// ---- 予告マーク ----

const MARK_SIZE = 56;
const MARK_RING_RADIUS = 29;
const MARK_RING_LENGTH = 2 * Math.PI * MARK_RING_RADIUS;

export function TelegraphMark({ telegraph }: { telegraph: Telegraph | null }) {
  if (!telegraph) return <View style={styles.markSlot} />;
  const tone = TELEGRAPH_COLORS[telegraph.tone];
  return (
    <View style={styles.markSlot} accessible accessibilityLabel={`相手の${telegraph.glyph}`}>
      <View style={[styles.mark, { backgroundColor: tone.wash, borderColor: tone.main }]}>
        <Text style={[styles.markGlyph, { color: tone.main }]}>{telegraph.glyph}</Text>
      </View>
      <Svg style={styles.markRing} width={MARK_SIZE + 12} height={MARK_SIZE + 12} viewBox="0 0 64 64">
        <Circle
          cx={32}
          cy={32}
          r={MARK_RING_RADIUS}
          fill="none"
          stroke={tone.main}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={MARK_RING_LENGTH}
          strokeDashoffset={MARK_RING_LENGTH * (1 - telegraph.ring)}
          // 12時の位置から時計回りに満ちていく
          transform="rotate(-90 32 32)"
        />
      </Svg>
      {telegraph.arrow !== null ? (
        <Text style={[styles.markArrow, { color: tone.main }, telegraph.arrow === DIR_RIGHT ? styles.markArrowRight : styles.markArrowLeft]}>
          {telegraph.arrow === DIR_RIGHT ? "▶" : "◀"}
        </Text>
      ) : null}
    </View>
  );
}

// ---- 守りの扇 ----

const FAN_DIRS: readonly { dir: SideDir; label: string }[] = [
  { dir: DIR_RIGHT, label: "右" },
  { dir: DIR_LEFT, label: "左" },
];

export function FanLayer({ width, height, fans, isOnStage = false }: { width: number; height: number; fans: { right: FanState; left: FanState }; isOnStage?: boolean }) {
  const geometry = fanGeometry(width, height);
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      {FAN_DIRS.map(({ dir }) => {
        const state = dir === DIR_RIGHT ? fans.right : fans.left;
        const colors = fanColors(state, isOnStage);
        return <Path key={dir} d={fanPath(geometry, dir)} fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5} />;
      })}
      {FAN_DIRS.map(({ dir, label }) => {
        const point = fanLabelPoint(geometry, dir);
        const { labelFill, labelStroke } = fanColors(dir === DIR_RIGHT ? fans.right : fans.left, isOnStage);
        const textProps = { x: point.x, y: point.y, fontSize: 14, fontWeight: "700", textAnchor: "middle", alignmentBaseline: "middle" } as const;
        // react-native-svg は paintOrder 非対応なので、縁取り用を下に重ねて塗りが縁に潰されないようにする
        return (
          <G key={dir}>
            {labelStroke ? (
              <SvgText {...textProps} fill={labelStroke} stroke={labelStroke} strokeWidth={3} strokeLinejoin="round">
                {label}
              </SvgText>
            ) : null}
            <SvgText {...textProps} fill={labelFill}>
              {label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ---- 熱 ----

/** 熱の間、画面の縁を赤く染める。中央は透明のまま（操作の邪魔をしない） */
export function HeatEdge({ isOn, isMotionReduced }: { isOn: boolean; isMotionReduced: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isOn) {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      return;
    }
    if (isMotionReduced) {
      opacity.setValue(0.85);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.65, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isOn, isMotionReduced, opacity]);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="heat" cx="50%" cy="50%" rx="75%" ry="75%">
            <Stop offset="0.5" stopColor={HEAT_COLOR} stopOpacity={0} />
            <Stop offset="1" stopColor="#ff4a1a" stopOpacity={0.5} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heat)" />
      </Svg>
    </Animated.View>
  );
}

export function HeatLabel({ ratio }: { ratio: number }) {
  return (
    <View style={styles.heat} pointerEvents="none">
      <Text style={styles.heatText}>熱</Text>
      <View style={styles.heatTrack}>
        <View style={[styles.heatFill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

// ---- ポップ文字・連打 ----

const POP_MS = 900;

export function PopText({ pop, fontSize, isMotionReduced }: { pop: (Pop & { id: number }) | null; fontSize: number; isMotionReduced: boolean }) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pop) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: POP_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [pop, progress]);
  if (!pop) return null;
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const motion = isMotionReduced
    ? []
    : [
        { translateY: progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [16, 0, -24] }) },
        { scale: progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [1.5, 1, 1] }) },
      ];
  return (
    <Animated.View pointerEvents="none" style={[styles.pop, { opacity, transform: motion }]}>
      <Text style={[styles.popText, { fontSize, color: POP_COLORS[pop.tone] }]}>{pop.text}</Text>
      {pop.sub ? <Text style={styles.popSub}>{pop.sub}</Text> : null}
    </Animated.View>
  );
}

export function ClinchCall({ clinch }: { clinch: ClinchHud }) {
  return (
    <View style={styles.clinch} pointerEvents="none" accessibilityLiveRegion="polite">
      <Text style={styles.clinchText}>連打！</Text>
      <Text style={styles.clinchSub}>がっぷり四つ　東 {clinch.east} ー {clinch.west} 西　勝った方が押す</Text>
    </View>
  );
}

// ---- ヒント・必殺ボタン ----

export function HintPill({ repeatHint }: { repeatHint: string | null }) {
  return (
    <View style={styles.hint} pointerEvents="none">
      {repeatHint ? (
        <Text style={styles.hintText}>
          <Text style={[styles.hintKey, { color: SIDE_COLORS.west }]}>{repeatHint}</Text>
          {"　手を変えると押しが戻る"}
        </Text>
      ) : (
        <Text style={styles.hintText}>
          {CONTROL_HINTS.map(({ key, action }, index) => (
            <Text key={key}>
              {index > 0 ? "　" : ""}
              <Text style={styles.hintKey}>{key}</Text>
              {` ${action}`}
            </Text>
          ))}
        </Text>
      )}
    </View>
  );
}

const SPECIAL_BUTTON_SIZE = 76;

export function SpecialButton({ name, gauge, isMotionReduced, onPress }: { name: string; gauge: number; isMotionReduced: boolean; onPress: () => void }) {
  const isReady = isSpecialReady(gauge);
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isReady || isMotionReduced) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.07, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isReady, isMotionReduced, pulse]);
  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`必殺 ${name}`}
        accessibilityState={{ disabled: !isReady }}
        disabled={!isReady}
        onPress={onPress}
        onTouchStart={stopGesture}
        style={[styles.special, isReady && styles.specialReady]}
      >
        {/* ゲージは下から満ちる。満タンで濃くする */}
        <View style={[styles.specialFill, { height: `${specialRatio(gauge) * 100}%`, opacity: isReady ? 0.75 : 0.35 }]} />
        <Text style={[styles.specialLabel, isReady && styles.specialLabelReady]}>{name}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  plate: { backgroundColor: colors.blushWash, borderRadius: 10, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.xs },
  plateRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  plateSide: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2 },
  plateName: { fontFamily: fonts.black, fontSize: 17, color: colors.charcoal, flexShrink: 0 },
  plateCaption: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.pencilGray },
  plateBarRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  plateBarLabel: { width: 28, fontFamily: fonts.bold, fontSize: 10, color: colors.pencilGray },
  plateBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(75,75,75,0.12)", overflow: "hidden" },
  plateBarFill: { height: "100%", backgroundColor: SPECIAL_COLOR },
  quit: { alignSelf: "center", paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: 999, backgroundColor: colors.paperWhite },
  quitLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.pencilGray },
  ring: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ringLabel: { fontFamily: fonts.bold, fontSize: 11 },
  ringTrackWrap: { flex: 1, height: 12, justifyContent: "center" },
  ringTrack: { height: 12, borderRadius: 6, backgroundColor: colors.blushWash, overflow: "hidden" },
  ringEnd: { position: "absolute", top: 0, bottom: 0, width: "4%" },
  ringEdge: { position: "absolute", top: 0, bottom: 0, backgroundColor: colors.cottonPink, opacity: 0.5 },
  ringMarker: { position: "absolute", top: -4, width: 8, height: 20, marginLeft: -4, borderRadius: 4, backgroundColor: colors.charcoal, borderWidth: 2, borderColor: colors.paperWhite },
  stamina: { alignItems: "center", gap: 3, width: 44 },
  staminaLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.charcoal },
  tube: { width: 16, height: 78, borderRadius: 8, borderWidth: 1.5, backgroundColor: colors.paperWhite, overflow: "hidden", justifyContent: "flex-end" },
  tubeFill: { position: "absolute", left: 0, right: 0, bottom: 0 },
  tubeGhost: { backgroundColor: "rgba(75,75,75,0.28)" },
  tubeTick: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(75,75,75,0.25)" },
  staminaWarn: { fontFamily: fonts.bold, fontSize: 10, color: SIDE_COLORS.west },
  markSlot: { height: MARK_SIZE + 12, width: 200, alignItems: "center", justifyContent: "center" },
  mark: { width: MARK_SIZE, height: MARK_SIZE, borderRadius: MARK_SIZE / 2, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  markRing: { position: "absolute" },
  markGlyph: { fontFamily: fonts.black, fontSize: 26 },
  markArrow: { position: "absolute", top: "50%", marginTop: -12, fontSize: 22 },
  markArrowRight: { left: "50%", marginLeft: MARK_SIZE / 2 + 12 },
  markArrowLeft: { right: "50%", marginRight: MARK_SIZE / 2 + 12 },
  heat: { alignItems: "center", gap: 4 },
  heatText: { fontFamily: fonts.black, fontSize: 22, letterSpacing: 2, color: HEAT_COLOR },
  heatTrack: { width: 120, height: 5, borderRadius: 3, backgroundColor: "rgba(255,122,31,0.2)", overflow: "hidden" },
  heatFill: { height: "100%", backgroundColor: HEAT_COLOR },
  pop: { alignItems: "center" },
  popText: {
    fontFamily: fonts.black,
    textAlign: "center",
    // 明るい背景でも、色付きの大きな文字が沈まないよう白い縁をつける
    textShadowColor: "rgba(255,255,255,0.95)",
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
  popSub: { marginTop: 2, fontFamily: fonts.bold, fontSize: 13, color: colors.charcoal, textAlign: "center" },
  clinch: { alignItems: "center", gap: 2 },
  clinchText: { fontFamily: fonts.black, fontSize: 30, color: TELEGRAPH_COLORS.grab.main },
  clinchSub: { fontFamily: fonts.bold, fontSize: 12, color: colors.charcoal },
  hint: { alignSelf: "center", maxWidth: "100%", backgroundColor: colors.blushWash, borderRadius: 999, paddingVertical: 5, paddingHorizontal: spacing.md },
  hintText: { fontFamily: fonts.regular, fontSize: 11, color: colors.pencilGray, textAlign: "center" },
  hintKey: { fontFamily: fonts.bold, color: colors.charcoal },
  special: {
    width: SPECIAL_BUTTON_SIZE,
    height: SPECIAL_BUTTON_SIZE,
    borderRadius: SPECIAL_BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: SPECIAL_COLOR,
    backgroundColor: colors.paperWhite,
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 6,
  },
  specialReady: { borderWidth: 3 },
  specialFill: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: SPECIAL_COLOR },
  specialLabel: { position: "absolute", left: 6, right: 6, top: 0, bottom: 0, textAlignVertical: "center", textAlign: "center", fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.charcoal },
  specialLabelReady: { color: colors.paperWhite },
});
