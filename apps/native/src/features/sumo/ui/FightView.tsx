import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

import { createStepper } from "../clock";
import { act, clinchTap } from "../engine";
import type { Game, SumoEvent } from "../types";
import {
  ClinchCall,
  FanLayer,
  HeatEdge,
  HeatLabel,
  HintPill,
  NamePlate,
  PopText,
  PositionBar,
  QuitButton,
  SpecialButton,
  StaminaTube,
  TelegraphMark,
  captionOf,
} from "./HudParts";
import { IDLE, touchDown, touchMove, touchUp, type InputCommand, type TouchPhase } from "./input";
import { hapticFor } from "./labels";
import { popFor, repeatHintFor, type Pop } from "./pop";
import { saveResult, type SumoRecord } from "./record";
import { asyncRecordStorage } from "./record-storage";
import { ResultView } from "./ResultView";
import { createMatch, PLAYER_SIDE, type MatchSetup } from "./session";
import { isSameSnapshot, snapshotOf, type HudSnapshot } from "./snapshot";
import { useReducedMotion } from "./use-reduced-motion";

/** HUD を React に流す最短間隔。ロジックは毎フレーム回すが、表示の更新は間引く */
const HUD_INTERVAL_MS = 50;
/** バックグラウンド復帰などで巨大な経過時間が来ても、一気に進めない */
const MAX_FRAME_MS = 100;
/** 決着の文字を見せてから、結果画面に切り替えるまでの間 */
const RESULT_DELAY_MS = 1000;
/** 「同じ手の連続」のヒントを出しておく時間 */
const REPEAT_HINT_MS = 1600;
const POP_MIN_FONT = 28;
const POP_MAX_FONT = 52;

const HAPTIC_STYLES = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
} satisfies Record<NonNullable<ReturnType<typeof hapticFor>>, () => Promise<void>>;

function playHaptic(event: SumoEvent): void {
  const kind = hapticFor(event, PLAYER_SIDE);
  // 触覚が使えない端末でも対戦は続けたいので、失敗は握りつぶさず警告に留める
  if (kind) HAPTIC_STYLES[kind]().catch((error: unknown) => console.warn("触覚フィードバックに失敗:", error));
}

type PopState = Pop & { id: number };

export function FightView({ setup, onRematch, onQuit }: { setup: MatchSetup; onRematch: () => void; onQuit: () => void }) {
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const isMotionReduced = useReducedMotion();
  const [size, setSize] = useState({ width: dimensions.width, height: dimensions.height });
  // ロジックの state は ref 内に置き、React には小さなスナップショットだけを渡す
  const eventSinkRef = useRef<(event: SumoEvent) => void>(() => undefined);
  const [game] = useState<Game>(() =>
    createMatch(
      setup,
      (event) => {
        playHaptic(event);
        eventSinkRef.current(event);
      },
      Date.now() % 2 ** 31,
    ),
  );
  const [hud, setHud] = useState<HudSnapshot>(() => snapshotOf(game, PLAYER_SIDE));
  const [pop, setPop] = useState<PopState | null>(() => ({ id: 0, text: "はっけよい！", sub: "", tone: "neutral", delayMs: 0 }));
  const [repeatHint, setRepeatHint] = useState<string | null>(null);
  const [record, setRecord] = useState<SumoRecord | null>(null);
  const [isResultShown, setIsResultShown] = useState(false);
  const hudRef = useRef(hud);
  const phaseRef = useRef<TouchPhase>(IDLE);
  const activeTouchRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const popIdRef = useRef(0);

  useEffect(() => {
    const timers = timersRef.current;
    const later = (callback: () => void, delayMs: number) => {
      if (delayMs <= 0) return callback();
      timers.push(setTimeout(callback, delayMs));
    };
    let repeatTimer: ReturnType<typeof setTimeout> | undefined;
    eventSinkRef.current = (event) => {
      const next = popFor(event, game.f, PLAYER_SIDE);
      if (next) later(() => setPop({ ...next, id: ++popIdRef.current }), next.delayMs);
      const hint = repeatHintFor(event, PLAYER_SIDE);
      if (hint) {
        setRepeatHint(hint);
        clearTimeout(repeatTimer);
        repeatTimer = setTimeout(() => setRepeatHint(null), REPEAT_HINT_MS);
      }
    };
    return () => {
      eventSinkRef.current = () => undefined;
      clearTimeout(repeatTimer);
      for (const timer of timers) clearTimeout(timer);
      timers.length = 0;
    };
  }, [game]);

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
        const next = snapshotOf(game, PLAYER_SIDE);
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

  // 決着したら戦績に加え、決まり手の文字を見せてから結果画面を出す
  useEffect(() => {
    if (!hud.isEnded) return;
    let isActive = true;
    saveResult(asyncRecordStorage, hud.winner === PLAYER_SIDE).then((next) => {
      if (isActive) setRecord(next);
    });
    const timer = setTimeout(() => setIsResultShown(true), RESULT_DELAY_MS);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [hud.isEnded, hud.winner]);

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
      const step = touchDown(phaseRef.current, { x: touch.pageX, y: touch.pageY, width: size.width, isClinch: game.clinch !== null });
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
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
  };

  const [east, west] = hud.fighters;
  const hasSpecial = game.mode.hasSpecial;
  const sidePadding = { paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right };
  const popFontSize = Math.min(POP_MAX_FONT, Math.max(POP_MIN_FONT, size.width * 0.09));

  return (
    <View
      style={styles.screen}
      onLayout={onLayout}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* 扇の基準点は画面下中央に固定。力士の位置には追従させない（docs/battle.md 4.1） */}
      <FanLayer width={size.width} height={size.height} fans={hud.fans} />
      {game.mode.hasHot ? <HeatEdge isOn={east.heat > 0} isMotionReduced={isMotionReduced} /> : null}

      <View style={[styles.top, sidePadding, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <NamePlate
          side="west"
          species={setup.opponentSpecies}
          caption={captionOf(setup.opponentSpecies, setup.difficulty.name, `${game.mode.name}モード`)}
          hasSpecial={hasSpecial}
          special={west.special}
          trailing={<QuitButton onPress={onQuit} />}
        />
        <PositionBar position={hud.position} />
      </View>

      <View style={styles.middle} pointerEvents="box-none">
        {/* 土俵の中央には何も置かない。相手の予告は上部に固定で出す */}
        <TelegraphMark telegraph={hud.telegraph} />
        {east.heat > 0 ? <HeatLabel ratio={east.heat} /> : null}
        <View style={[styles.edgeTube, { left: spacing.sm + insets.left }]} pointerEvents="none">
          <StaminaTube stamina={east.stamina} side="east" isMotionReduced={isMotionReduced} />
        </View>
        <View style={[styles.edgeTube, { right: spacing.sm + insets.right }]} pointerEvents="none">
          <StaminaTube stamina={west.stamina} side="west" isMotionReduced={isMotionReduced} />
        </View>
        <View style={styles.popArea} pointerEvents="none">
          {hud.clinch ? <ClinchCall clinch={hud.clinch} /> : <PopText pop={pop} fontSize={popFontSize} isMotionReduced={isMotionReduced} />}
        </View>
      </View>

      <View style={[styles.bottom, sidePadding, { paddingBottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
        <HintPill repeatHint={repeatHint} />
        <View style={styles.bottomRow} pointerEvents="box-none">
          <View style={styles.playerPlate} pointerEvents="none">
            <NamePlate
              side="east"
              species={setup.playerSpecies}
              caption={captionOf(setup.playerSpecies)}
              hasSpecial={hasSpecial}
              special={east.special}
            />
          </View>
          {hasSpecial ? (
            <SpecialButton
              name={setup.playerSpecies.special.name}
              gauge={east.special}
              isMotionReduced={isMotionReduced}
              onPress={() => act(game, player, "special")}
            />
          ) : null}
        </View>
      </View>

      {hud.isEnded && isResultShown ? (
        <ResultView game={game} setup={setup} record={record} onRematch={onRematch} onQuit={onQuit} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paperWhite },
  top: { gap: spacing.sm },
  middle: { flex: 1, alignItems: "center", paddingTop: spacing.sm },
  edgeTube: { position: "absolute", top: spacing.md },
  popArea: { position: "absolute", left: spacing.xl, right: spacing.xl, top: "42%", alignItems: "center" },
  bottom: { gap: spacing.sm },
  bottomRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.md },
  playerPlate: { flex: 1, maxWidth: 300 },
});
