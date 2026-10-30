// 1レースぶんのループ。rAF を1本だけ回し、毎フレーム runFrame → camera director → overlay・haptics へ流す。
// React の state を更新するのは順位・パネルの種類・名札の相手が変わったときだけで、ゲージ・針・名札の位置は shared value に書く
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSharedValue } from "react-native-reanimated";

import { createCameraDirector, type CameraOutput, type CameraRunner } from "../camera";
import { RUNNER_COUNT } from "../config";
import { nextHurdleDistance } from "../minigames";
import { createRng } from "../rng";
import { createSession, runFrame } from "../session";
import { projectToScreen } from "../three/project";
import type { Race } from "../types";
import { HURDLE_TAP_MAX_DISTANCE_M, IDLE, touchCancel, touchDown, touchMove, touchUp, type InputCommand, type TouchPhase, type TouchStep } from "./input";
import { placeRivalLabel, type RivalLabelPlacement } from "./overlay-state";
import type { MiniGamePanelView } from "./MiniGamePanel";
import { cameraInputOf, RIVAL_LABEL_HEIGHT_M, triggerOf } from "./race-screen-camera";
import { isSamePanelSpec, panelSpecOf, upcomingZoneOf, type PanelSpec } from "./race-screen-panel";
import { buildResult, createTally, tallyFrame, type RaceResultView } from "./race-screen-result";
import type { SessionOptions } from "./race-screen-setup";
import { countdownLabel, hasHitTimeLimit, isCountdown, MAX_FRAME_SEC } from "./race-screen-timing";
import { RIVAL_LABEL_SIZE } from "./RivalLabel";
import { useRaceHaptics } from "./use-race-haptics";
import { useRaceOverlay } from "./use-race-overlay";

/** director の乱数。レース本体の乱数とは分け、カメラの抽選がレースの展開を変えないようにする */
const DIRECTOR_SEED_SALT = 0x5eed;
const PLAYER_INDEX = 0;
const INITIAL_ASPECT = 9 / 16;
/** ハードルが残っていないときにパネルへ渡す距離。HURDLE_TAP_MAX_DISTANCE_M より大きければ「まだ遠い」の表示になる */
const NO_HURDLE_DISTANCE_M = HURDLE_TAP_MAX_DISTANCE_M * 2;
const HIDDEN_LABEL: RivalLabelPlacement = { isVisible: false, x: 0, y: 0 };

export interface RaceRun {
  raceRef: { current: Race };
  cameraRef: { current: CameraOutput | null };
  overlay: ReturnType<typeof useRaceOverlay>["overlay"];
  rank: number;
  total: number;
  panel: MiniGamePanelView | null;
  rival: { name: string; placement: ReturnType<typeof useSharedValue<RivalLabelPlacement>> } | null;
  onLayout: (size: { width: number; height: number }) => void;
  onTouchDown: (x: number, y: number) => void;
  onTouchMove: (x: number, y: number) => void;
  onTouchUp: (x: number, y: number) => void;
  onTouchCancel: () => void;
}

/** 開始ごとに key を変えたコンポーネントから呼ぶ。onOver は結果が決まったとき1回だけ呼ぶ */
export function useRaceRun(options: SessionOptions, onOver: (result: RaceResultView) => void): RaceRun {
  const [session] = useState(() => createSession(options));
  const raceRef = useRef(session.race);
  const cameraRef = useRef<CameraOutput | null>(null);
  const director = useMemo(() => createCameraDirector(createRng(options.seed ^ DIRECTOR_SEED_SALT)), [options.seed]);
  const { overlay, push } = useRaceOverlay();
  const play = useRaceHaptics();

  const [rank, setRank] = useState(session.race.playerRank);
  const [panelSpec, setPanelSpec] = useState<PanelSpec | null>(null);
  const [rivalIndex, setRivalIndex] = useState<number | null>(null);

  const gauge = useSharedValue(0);
  const tapCount = useSharedValue(0);
  const hurdleDistance = useSharedValue(NO_HURDLE_DISTANCE_M);
  const needle = useSharedValue(0);
  const rivalPlacement = useSharedValue<RivalLabelPlacement>(HIDDEN_LABEL);

  const viewportRef = useRef({ width: 0, height: 0 });
  const inputsRef = useRef<InputCommand[]>([]);
  const phaseRef = useRef<TouchPhase>(IDLE);
  const onOverRef = useRef(onOver);
  onOverRef.current = onOver;

  const accept = useCallback((step: TouchStep) => {
    phaseRef.current = step.phase;
    inputsRef.current.push(...step.commands);
  }, []);
  const onTouchDown = useCallback(
    (x: number, y: number) => {
      // 指が増えたときや up を取りこぼしたとき、押しっぱなしのまま以後の入力が全部無視されないよう、いったん離した扱いにしてから受ける
      if (phaseRef.current.kind !== "idle") accept(touchCancel(phaseRef.current));
      accept(touchDown(phaseRef.current, { x, y, width: viewportRef.current.width, atMs: performance.now() }));
    },
    [accept],
  );
  const onTouchMove = useCallback((x: number, y: number) => accept(touchMove(phaseRef.current, { x, y, width: viewportRef.current.width })), [accept]);
  const onTouchUp = useCallback((x: number, y: number) => accept(touchUp(phaseRef.current, { x, y, width: viewportRef.current.width })), [accept]);
  const onTouchCancel = useCallback(() => accept(touchCancel(phaseRef.current)), [accept]);
  const onLayout = useCallback((size: { width: number; height: number }) => {
    viewportRef.current = size;
  }, []);

  useEffect(() => {
    const cameraRunners: CameraRunner[] = [];
    let frameId = 0;
    let startMs: number | null = null;
    let lastMs = 0;
    let lastLabel: string | null = null;
    let lastPanelSpec: PanelSpec | null = null;
    let lastRank = session.race.playerRank;
    let lastRivalIndex: number | null = null;
    let isLabelShown = false;
    const tally = createTally();
    const { race } = session;

    const finish = () => onOverRef.current(buildResult(race, tally, options.runnerNames, options.collisions));

    const tick = () => {
      const nowMs = performance.now();
      startMs ??= nowMs;
      lastMs = lastMs || nowMs;
      const elapsedMs = nowMs - startMs;
      const dtSec = Math.min((nowMs - lastMs) / 1000, MAX_FRAME_SEC);
      lastMs = nowMs;

      if (hasHitTimeLimit(elapsedMs)) return finish();

      const label = countdownLabel(elapsedMs);
      if (label !== lastLabel) {
        lastLabel = label;
        if (label !== null) push([{ type: "bigText", text: label, isBad: false }], nowMs);
      }

      let trigger = null;
      let isOver = false;
      if (isCountdown(elapsedMs)) {
        // スタート前の入力は、カウントダウン中に押した指がスタートの瞬間の連打に化けないよう捨てる
        inputsRef.current.length = 0;
      } else {
        const inputs = inputsRef.current.splice(0);
        const frame = runFrame(session, { realDtSec: dtSec, nowMs, inputs, isCloseUp: cameraRef.current?.kind === "close" });
        tallyFrame(tally, frame);
        if (frame.presentations.length > 0) push(frame.presentations, nowMs);
        play(frame, nowMs);
        trigger = triggerOf(frame.raceEvents, frame.presentations);
        isOver = frame.isOver;
        tapCount.value += frame.minigameEvents.filter((event) => event.type === "dashTap").length;
      }

      writeMinigameValues();
      if (race.playerRank !== lastRank) {
        lastRank = race.playerRank;
        setRank(lastRank);
      }
      const spec = panelSpecOf(session.minigame, upcomingZoneOf(race.course, race.runners[PLAYER_INDEX].s));
      if (!isSamePanelSpec(spec, lastPanelSpec)) {
        lastPanelSpec = spec;
        setPanelSpec(spec);
      }

      const { width, height } = viewportRef.current;
      const output = director.update(cameraInputOf(race, cameraRunners, height > 0 ? width / height : INITIAL_ASPECT, isCountdown(elapsedMs), trigger), dtSec);
      cameraRef.current = output;
      placeLabel(output);

      if (isOver) return finish();
      frameId = requestAnimationFrame(tick);
    };

    function writeMinigameValues() {
      const game = session.minigame;
      if (game?.kind === "dash") gauge.value = game.perf;
      if (game?.kind === "bridge") needle.value = game.needle;
      if (game?.kind === "hurdle") hurdleDistance.value = nextHurdleDistance(game, race) ?? NO_HURDLE_DISTANCE_M;
    }

    function placeLabel(output: CameraOutput) {
      const target = output.kind === "rival" ? output.rivalIndex : null;
      if (target !== lastRivalIndex) {
        lastRivalIndex = target;
        setRivalIndex(target);
      }
      if (target === null) {
        if (isLabelShown) rivalPlacement.value = HIDDEN_LABEL;
        isLabelShown = false;
        return;
      }
      const runner = race.runners[target];
      const viewport = viewportRef.current;
      const point = projectToScreen(
        { x: runner.x, y: runner.y + RIVAL_LABEL_HEIGHT_M, z: runner.z },
        { position: output.position, target: output.target, fovDeg: output.fovDeg },
        viewport,
      );
      rivalPlacement.value = placeRivalLabel(point, viewport, RIVAL_LABEL_SIZE);
      isLabelShown = true;
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // session・director は開始ごとに作り直す（key で作り直される）ので、このループは1回だけ張る
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panel = useMemo<MiniGamePanelView | null>(() => {
    if (!panelSpec) return null;
    if (panelSpec.isReady) return { kind: panelSpec.kind, isReady: true };
    switch (panelSpec.kind) {
      case "dash":
        return { kind: "dash", gauge, tapCount };
      case "hurdle":
        return { kind: "hurdle", distance: hurdleDistance };
      case "bridge":
        return { kind: "bridge", needle };
      case "swipe":
        return { kind: "swipe", arrows: panelSpec.arrows, arrowIndex: panelSpec.arrowIndex };
    }
  }, [panelSpec, gauge, tapCount, hurdleDistance, needle]);

  const rival = rivalIndex === null ? null : { name: options.runnerNames[rivalIndex] ?? "", placement: rivalPlacement };

  return { raceRef, cameraRef, overlay, rank, total: RUNNER_COUNT, panel, rival, onLayout, onTouchDown, onTouchMove, onTouchUp, onTouchCancel };
}
