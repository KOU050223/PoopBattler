import type { KeyValueStorage } from "@poopbattler/domain/ports";

import { EMPTY_GACHA_STATE, type GachaState } from "./gacha-state";
import { GACHA_HEADS, GACHA_POOPMS } from "./gacha-pool";

// TODO(gacha): サーバーに所持を持たせる時にこのキーごと置き換える（今回は端末内だけ）。
export const GACHA_STORAGE_KEY = "poop-battler.gacha";

const isKnown = <T extends string>(allowed: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value);

/** 壊れた値・未知のIDは捨てて、読める部分だけ使う（古い版や手編集で起動できなくならないように）。 */
export function parseGachaState(raw: unknown): GachaState {
  if (typeof raw !== "object" || raw === null) return EMPTY_GACHA_STATE;
  const value = raw as Record<string, unknown>;
  const stones = typeof value.stones === "number" && Number.isInteger(value.stones) && value.stones >= 0 ? value.stones : 0;
  const lastClaimedDay = typeof value.lastClaimedDay === "number" && Number.isFinite(value.lastClaimedDay) ? value.lastClaimedDay : null;
  const list = (input: unknown) => (Array.isArray(input) ? input : []);
  return {
    stones,
    lastClaimedDay,
    heads: [...new Set(list(value.heads).filter((id) => isKnown(GACHA_HEADS, id)))],
    poopms: [...new Set(list(value.poopms).filter((id) => isKnown(GACHA_POOPMS, id)))],
  };
}

export async function readGachaState(storage: KeyValueStorage): Promise<GachaState> {
  try {
    const raw = await storage.getItem(GACHA_STORAGE_KEY);
    return raw == null ? EMPTY_GACHA_STATE : parseGachaState(JSON.parse(raw));
  } catch {
    return EMPTY_GACHA_STATE;
  }
}

export async function writeGachaState(storage: KeyValueStorage, state: GachaState): Promise<void> {
  await storage.setItem(GACHA_STORAGE_KEY, JSON.stringify(state));
}
