import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/features/records-ui";
import { colors, fonts, radius, spacing } from "@/theme";

import { createStepper } from "../clock";
import { CFG } from "../config";
import { act, clinchTap } from "../engine";
import type { Game, SumoEvent } from "../types";
import { DIR_LEFT, DIR_RIGHT, IDLE, touchDown, touchMove, touchUp, type InputCommand, type SideDir, type TouchPhase } from "./input";
import { hapticFor, SPECIES_SHORT_NAMES, type HapticKind, type MarkTone } from "./labels";
import { createMatch, PLAYER_SIDE, type MatchSetup } from "./session";
import { isSameSnapshot, snapshotOf, type FighterHud, type HudSnapshot } from "./snapshot";

/** HUD を React に流す最短間隔。ロジックは毎フレーム回すが、表示の更新は間引く */
const HUD_INTERVAL_MS = 50;
/** バックグラウンド復帰などで巨大な経過時間が来ても、一気に進めない */
const MAX_FRAME_MS = 100;

const HAPTIC_STYLES = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
} satisfies Record<HapticKind, () => Promise<void>>;

function playHaptic(event: SumoEvent): void {
  const kind = hapticFor(event, PLAYER_SIDE);
  // 触覚が使えない端末でも対戦は続けたいので、失敗は握りつぶさず警告に留める
  if (kind) HAPTIC_STYLES[kind]().catch((error: unknown) => console.warn("触覚フィードバックに失敗:", error));
}

const HOT_COLOR = "#ff9a3c";
const TONE_COLORS: Record<MarkTone, string> = {
  neutral: colors.pencilGray,
  attack: colors.flushEdge,
  guard: colors.sparkBlue,
  down: colors.fadedGray,
  hot: HOT_COLOR,
};

export function FightView({ setup, onRematch, onQuit }: { setup: MatchSetup; onRematch: () => void; onQuit: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // ロジックの state は ref 内に置き、React には小さなスナップショットだけを渡す
  const [game] = useState<Game>(() => createMatch(setup, playHaptic, Date.now() % 2 ** 31));
  const [hud, setHud] = useState<HudSnapshot>(() => snapshotOf(game));
  const hudRef = useRef(hud);
  const phaseRef = useRef<TouchPhase>(IDLE);
  const activeTouchRef = useRef<string | null>(null);

  useEffect(() => {
    const stepper = createStepper(game);
    let frameId = 0;
    let lastFrameAt = performance.now();
    let lastHudAt = 0;
    const tick = (now: number) => {
      stepper.advance(Math.min(now - lastFrameAt, MAX_FRAME_MS));
      lastFrameAt = now;
      const isEnded = game.phase === "end";
      if (isEnded || now - lastHudAt >= HUD_INTERVAL_MS) {
        lastHudAt = now;
        const next = snapshotOf(game);
        if (!isSameSnapshot(hudRef.current, next)) {
          hudRef.current = next;
          setHud(next);
        }
      }
      if (!isEnded) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [game]);

  const player = game.f[PLAYER_SIDE];
  const apply = (commands: InputCommand[]) => {
    for (const command of commands) {
      switch (command.type) {
        case "guard":
          act(game, player, "inashi", { dir: command.dir });
          break;
        case "guardEnd":
          act(game, player, "inashiEnd");
          break;
        case "tsuki":
          act(game, player, "tsuki", command.dir);
          break;
        case "grab":
          act(game, player, "grab");
          break;
        case "grabRelease":
          act(game, player, "grabRelease");
          break;
        case "clinchTap":
          clinchTap(game, player);
          break;
      }
    }
  };

  const findActive = (event: GestureResponderEvent) =>
    event.nativeEvent.changedTouches.find((touch) => touch.identifier === activeTouchRef.current);

  const onTouchStart = (event: GestureResponderEvent) => {
    if (game.phase !== "fight") return;
    for (const touch of event.nativeEvent.changedTouches) {
      if (activeTouchRef.current !== null) {
        // 2本目以降の指は、がっぷり中の連打にだけ使う
        if (game.clinch) clinchTap(game, player);
        continue;
      }
      activeTouchRef.current = touch.identifier;
      const step = touchDown(phaseRef.current, { x: touch.pageX, y: touch.pageY, width, isClinch: game.clinch !== null });
      phaseRef.current = step.phase;
      apply(step.commands);
    }
  };
  const onTouchMove = (event: GestureResponderEvent) => {
    const touch = findActive(event);
    if (!touch) return;
    const step = touchMove(phaseRef.current, { x: touch.pageX, y: touch.pageY });
    phaseRef.current = step.phase;
    apply(step.commands);
  };
  const onTouchEnd = (event: GestureResponderEvent) => {
    if (!findActive(event)) return;
    activeTouchRef.current = null;
    const step = touchUp(phaseRef.current);
    phaseRef.current = step.phase;
    apply(step.commands);
  };

  const [me, opponent] = hud.fighters;
  const canSpecial = game.mode.hasSpecial && me.special >= 100;

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <View style={styles.top} pointerEvents="none">
        <FighterPanel
          name={SPECIES_SHORT_NAMES[setup.opponentSpecies.id]}
          title={`相手 ${setup.difficulty.name}`}
          hud={opponent}
          hasSpecial={game.mode.hasSpecial}
        />
        <PositionBar position={hud.position} />
      </View>

      <View style={styles.middle} pointerEvents="none">
        {hud.isClinch ? <Text style={styles.clinchCall}>がっぷり！ 連打！</Text> : null}
      </View>

      <View style={styles.bottom} pointerEvents="none">
        <FighterPanel name={SPECIES_SHORT_NAMES[setup.playerSpecies.id]} title="自分" hud={me} hasSpecial={game.mode.hasSpecial} />
        {/* 扇は画面下中央に固定。力士の位置には追従させない（docs/battle.md 4.1） */}
        <View style={styles.fans}>
          <Fan label="左" dir={DIR_LEFT} guardDir={me.guardDir} threatDir={hud.threatDir} />
          <Fan label="右" dir={DIR_RIGHT} guardDir={me.guardDir} threatDir={hud.threatDir} />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="必殺"
        disabled={!canSpecial}
        onPress={() => act(game, player, "special")}
        style={[styles.specialButton, { bottom: insets.bottom + spacing.xl }, !canSpecial && styles.specialDisabled]}
      >
        <Text style={styles.specialLabel}>必殺</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={onQuit} style={[styles.quit, { top: insets.top + spacing.sm }]}>
        <Text style={styles.quitLabel}>やめる</Text>
      </Pressable>

      {hud.isEnded ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>{hud.winner === PLAYER_SIDE ? "勝ち！" : "負け…"}</Text>
          <Text style={styles.resultDetail}>{game.km || " "}</Text>
          <View style={styles.resultActions}>
            <Button label="もう一度" onPress={onRematch} />
            <Button label="設定へ" variant="secondary" onPress={onQuit} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function FighterPanel({ name, title, hud, hasSpecial }: { name: string | undefined; title: string; hud: FighterHud; hasSpecial: boolean }) {
  const tone: MarkTone = hud.mark.tone;
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelName}>{title}　{name}</Text>
        <View style={styles.marks}>
          {hud.isHot ? <Text style={[styles.mark, { color: HOT_COLOR }]}>熱</Text> : null}
          <Text style={[styles.mark, { color: TONE_COLORS[tone] }]}>{hud.mark.label}</Text>
        </View>
      </View>
      <Gauge label="息" value={hud.stamina} color={hud.stamina > 50 ? "#4cae6a" : hud.stamina > 25 ? "#e0b030" : "#d85a5a"} />
      {hasSpecial ? <Gauge label="必殺" value={hud.special} color={hud.special >= 100 ? colors.flushPink : colors.cottonPink} /> : null}
    </View>
  );
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.gaugeRow}>
      <Text style={styles.gaugeLabel}>{label}</Text>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** −130〜+130。右へ寄るほど自分が押している（右端で相手の負け） */
function PositionBar({ position }: { position: number }) {
  const ratio = (position + CFG.OUT) / (CFG.OUT * 2);
  const edgeStart = (CFG.OUT - CFG.EDGE) / (CFG.OUT * 2);
  return (
    <View style={styles.positionWrap}>
      <View style={styles.positionTrack}>
        <View style={[styles.edgeZone, { left: 0, width: `${edgeStart * 100}%` }]} />
        <View style={[styles.edgeZone, { right: 0, width: `${edgeStart * 100}%` }]} />
        <View style={styles.centerLine} />
        <View style={[styles.positionMarker, { left: `${ratio * 100}%` }]} />
      </View>
      <View style={styles.positionLabels}>
        <Text style={styles.positionLabel}>自分の負け</Text>
        <Text style={styles.positionLabel}>相手の負け</Text>
      </View>
    </View>
  );
}

function Fan({ label, dir, guardDir, threatDir }: { label: string; dir: SideDir; guardDir: SideDir | null; threatDir: SideDir | null }) {
  const isGuarding = guardDir === dir;
  const isThreatened = threatDir === dir;
  return (
    <View style={[styles.fan, isGuarding && styles.fanGuard, isThreatened && styles.fanThreat]}>
      <Text style={[styles.fanLabel, isGuarding && styles.fanLabelOn]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paperWhite, paddingHorizontal: spacing.lg, justifyContent: "space-between" },
  top: { gap: spacing.md },
  middle: { alignItems: "center" },
  clinchCall: { fontFamily: fonts.black, fontSize: 24, color: colors.flushEdge },
  bottom: { gap: spacing.md },
  panel: { gap: 4 },
  panelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  panelName: { fontFamily: fonts.bold, fontSize: 13, color: colors.charcoal },
  marks: { flexDirection: "row", gap: spacing.sm },
  mark: { fontFamily: fonts.black, fontSize: 14 },
  gaugeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  gaugeLabel: { width: 32, fontFamily: fonts.bold, fontSize: 11, color: colors.pencilGray },
  gaugeTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.blushWash, overflow: "hidden" },
  gaugeFill: { height: "100%", borderRadius: 4 },
  positionWrap: { gap: 2 },
  positionTrack: { height: 14, borderRadius: 7, backgroundColor: colors.blushWash, overflow: "hidden" },
  edgeZone: { position: "absolute", top: 0, bottom: 0, backgroundColor: colors.cottonPink, opacity: 0.55 },
  centerLine: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: colors.fadedGray },
  positionMarker: { position: "absolute", top: 1, width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: colors.flushEdge },
  positionLabels: { flexDirection: "row", justifyContent: "space-between" },
  positionLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.fadedGray },
  fans: { flexDirection: "row", justifyContent: "center", gap: spacing.md },
  fan: {
    width: 96,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.blushWash,
    alignItems: "center",
    justifyContent: "center",
  },
  fanGuard: { backgroundColor: colors.sparkBlue },
  fanThreat: { backgroundColor: "#ffe27a" },
  fanLabel: { fontFamily: fonts.black, fontSize: 18, color: colors.pencilGray },
  fanLabelOn: { color: colors.paperWhite },
  specialButton: {
    position: "absolute",
    right: spacing.lg,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.flushPink,
    borderBottomWidth: 4,
    borderBottomColor: colors.flushDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  specialDisabled: { opacity: 0.35 },
  specialLabel: { fontFamily: fonts.black, fontSize: 16, color: colors.paperWhite },
  quit: { position: "absolute", right: spacing.lg, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  quitLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.pencilGray },
  result: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  resultTitle: { fontFamily: fonts.black, fontSize: 32, color: colors.charcoal },
  resultDetail: { fontFamily: fonts.bold, fontSize: 14, color: colors.pencilGray },
  resultActions: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.lg },
});
