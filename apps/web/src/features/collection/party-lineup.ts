import { PARTY_SIZE } from "@/features/battle/battle.constants";

export const PARTY_LINEUP_STORAGE_KEY = "poop-battler.party-lineup";

export type PartyLineup = [
  string | null,
  string | null,
  string | null,
];

/** 所持個体を新しい順に左詰めし、足りない枠はレンタル（null）にする。 */
export function defaultLineup(ownedIdsNewestFirst: readonly string[]): PartyLineup {
  const ids = ownedIdsNewestFirst.slice(0, PARTY_SIZE);
  return [ids[0] ?? null, ids[1] ?? null, ids[2] ?? null];
}

export function parsePartyLineup(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || seen.has(item)) {
      continue;
    }
    seen.add(item);
    ids.push(item);
    if (ids.length >= PARTY_SIZE) {
      break;
    }
  }
  return ids;
}

/**
 * 保存済みの先発IDを、今も持っている個体だけに直す。
 *
 * 足りない枠は新しい順の所持個体で埋める。所持が3体未満なら null（レンタル）。
 */
export function resolveLineup(
  stored: unknown,
  ownedIdsNewestFirst: readonly string[],
): PartyLineup {
  const ownedSet = new Set(ownedIdsNewestFirst);
  const kept = parsePartyLineup(stored).filter((id) => ownedSet.has(id));
  const used = new Set(kept);
  const filled = [...kept];

  if (filled.length < PARTY_SIZE) {
    for (const id of ownedIdsNewestFirst) {
      if (used.has(id)) {
        continue;
      }
      filled.push(id);
      used.add(id);
      if (filled.length >= PARTY_SIZE) {
        break;
      }
    }
  }

  return [filled[0] ?? null, filled[1] ?? null, filled[2] ?? null];
}

/**
 * 選択中の先発枠と、リストで選んだ所持個体を入れ替える。
 *
 * 既に別枠に入っている個体なら枠同士を入れ替える。
 * ベンチから入れる場合は、その枠の個体がベンチへ下がる。
 */
export function swapLineupSlot(
  lineup: PartyLineup,
  slotIndex: number,
  ownershipId: string,
): PartyLineup {
  if (slotIndex < 0 || slotIndex >= PARTY_SIZE) {
    return lineup;
  }
  if (lineup[slotIndex] === ownershipId) {
    return lineup;
  }

  const next: PartyLineup = [lineup[0], lineup[1], lineup[2]];
  const existingIndex = lineup.findIndex((id) => id === ownershipId);
  if (existingIndex >= 0) {
    next[slotIndex] = ownershipId;
    next[existingIndex] = lineup[slotIndex];
    return compactLineup(next);
  }

  next[slotIndex] = ownershipId;
  return compactLineup(next);
}

export function lineupOwnedIds(lineup: PartyLineup): string[] {
  return lineup.filter((id): id is string => id != null);
}

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

export function readPartyLineup(storage: Pick<Storage, "getItem"> | null): unknown {
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
  storage: Pick<Storage, "setItem">,
  lineup: PartyLineup,
): void {
  storage.setItem(
    PARTY_LINEUP_STORAGE_KEY,
    JSON.stringify(lineupOwnedIds(lineup)),
  );
  listeners.forEach((listener) => listener());
}

function compactLineup(lineup: PartyLineup): PartyLineup {
  return defaultLineup(lineupOwnedIds(lineup));
}
