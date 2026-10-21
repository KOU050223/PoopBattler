import { useSyncExternalStore } from "react";

import { DEFAULT_BATTLE_SPEED, nextBattleSpeed, type BattleSpeed } from "@poopbattler/domain/battle/battle.constants";
import { readBattleSpeed, subscribeBattleSpeed, writeBattleSpeed } from "@poopbattler/domain/battle/battle-speed";

import { battleSpeedCache } from "./battle-speed-cache";

/** 倍速の購読。呼び出し側は battleSpeedCache.load() 完了後に使う。 */
export function useBattleSpeed(): [BattleSpeed, () => void] {
  const speed = useSyncExternalStore(
    subscribeBattleSpeed,
    () => readBattleSpeed(battleSpeedCache.storage),
    () => DEFAULT_BATTLE_SPEED,
  );
  return [speed, () => writeBattleSpeed(battleSpeedCache.storage, nextBattleSpeed(speed))];
}
