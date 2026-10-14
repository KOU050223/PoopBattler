import type { KeyValueStorage } from "@poopbattler/domain/ports";
import { lineupOwnedIds, parsePartyLineup, resolveLineup, type PartyLineup } from "@poopbattler/domain/records/party-lineup";

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

/**
 * バトル開始時に送る編成の user_characters.id 配列。
 * 未編成（端末に保存なし）なら空配列。start_battle が所持個体を新しい順に自動選出する。
 * 編成済みなら所持確認（resolveLineup）まで済ませたIDを返す。HP/攻/速は送らない（サーバー確定）。
 */
export async function loadBattlePartyIds(
  storage: KeyValueStorage,
  ownedIdsNewestFirst: readonly string[],
): Promise<string[]> {
  if (parsePartyLineup(await readPartyLineup(storage)).length === 0) return [];
  return lineupOwnedIds(await loadPartyLineup(storage, ownedIdsNewestFirst));
}
