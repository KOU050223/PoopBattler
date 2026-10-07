import {
  lineupOwnedIds,
  type PartyLineup,
} from "@poopbattler/domain/records/party-lineup";
import type { SyncKeyValueStorage } from "@poopbattler/domain/ports";

export const PARTY_LINEUP_STORAGE_KEY = "poop-battler.party-lineup";

const listeners = new Set<() => void>();

export function subscribePartyLineup(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getPartyLineupSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(PARTY_LINEUP_STORAGE_KEY);
}

export function readPartyLineup(storage: Pick<SyncKeyValueStorage, "getItem"> | null): unknown {
  if (storage == null) {
    return null;
  }

  const raw = storage.getItem(PARTY_LINEUP_STORAGE_KEY);
  if (raw == null) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writePartyLineup(
  storage: Pick<SyncKeyValueStorage, "setItem">,
  lineup: PartyLineup,
): void {
  storage.setItem(
    PARTY_LINEUP_STORAGE_KEY,
    JSON.stringify(lineupOwnedIds(lineup)),
  );
  listeners.forEach((listener) => listener());
}
