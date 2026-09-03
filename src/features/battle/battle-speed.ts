import {
  BATTLE_SPEED_STORAGE_KEY,
  DEFAULT_BATTLE_SPEED,
  isBattleSpeed,
  type BattleSpeed,
} from "./battle.constants";

const listeners = new Set<() => void>();

export function subscribeBattleSpeed(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function readBattleSpeed(
  storage: Pick<Storage, "getItem"> | null,
): BattleSpeed {
  if (storage == null) {
    return DEFAULT_BATTLE_SPEED;
  }

  const parsed = Number(storage.getItem(BATTLE_SPEED_STORAGE_KEY));
  return isBattleSpeed(parsed) ? parsed : DEFAULT_BATTLE_SPEED;
}

export function writeBattleSpeed(
  storage: Pick<Storage, "setItem">,
  speed: BattleSpeed,
): void {
  storage.setItem(BATTLE_SPEED_STORAGE_KEY, String(speed));
  listeners.forEach((listener) => listener());
}
