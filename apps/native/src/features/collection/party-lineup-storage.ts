import type { KeyValueStorage } from "@poopbattler/domain/ports";
import { lineupOwnedIds, resolveLineup, type PartyLineup } from "@poopbattler/domain/records/party-lineup";

// web / バトル画面と同じキー・形式（所持個体IDのJSON配列）。
export const PARTY_LINEUP_STORAGE_KEY = "poop-battler.party-lineup";

export async function readPartyLineup(storage: KeyValueStorage): Promise<unknown> {
  try {
    const raw = await storage.getItem(PARTY_LINEUP_STORAGE_KEY);
    return raw == null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function loadPartyLineup(storage: KeyValueStorage, ownedIdsNewestFirst: readonly string[]): Promise<PartyLineup> {
  return resolveLineup(await readPartyLineup(storage), ownedIdsNewestFirst);
}

export async function writePartyLineup(storage: KeyValueStorage, lineup: PartyLineup): Promise<void> {
  await storage.setItem(PARTY_LINEUP_STORAGE_KEY, JSON.stringify(lineupOwnedIds(lineup)));
}
