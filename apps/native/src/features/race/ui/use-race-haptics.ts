import * as Haptics from "expo-haptics";
import { useCallback, useRef } from "react";

import type { MinigameEvent, RaceEvent } from "../types";
import { createHapticGate, hapticKindsOf, type HapticKind } from "./haptic-plan";

const PLAYERS: Record<HapticKind, () => Promise<void>> = {
  bump: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  perfect: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  stumble: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  sRank: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  dashTap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
};

export interface HapticFrame {
  raceEvents: readonly RaceEvent[];
  minigameEvents: readonly MinigameEvent[];
}

/** 毎フレームの FrameResult を渡すと、鳴らす出来事だけを間引いて鳴らす。React の state は使わない */
export function useRaceHaptics(): (frame: HapticFrame, nowMs: number) => void {
  const gateRef = useRef(createHapticGate());
  return useCallback((frame, nowMs) => {
    for (const kind of hapticKindsOf(frame.raceEvents, frame.minigameEvents)) {
      if (!gateRef.current.tryFire(kind, nowMs)) continue;
      // 触覚は演出の補助なので、鳴らせなくてもレースは止めない
      PLAYERS[kind]().catch((error: unknown) => console.warn("触覚を鳴らせませんでした:", error));
    }
  }, []);
}
