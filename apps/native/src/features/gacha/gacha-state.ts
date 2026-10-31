import type { HeadId } from "../battle/poopm-appearance";
import { toLocalDayNumber } from "../streak/calc-streak";
import { GACHA_HEADS, GACHA_POOPMS, POOPM_CHANCE, type GachaItem } from "./gacha-pool";

// 石は整数で数える。ガチャ1回 = 2個で、重複したとき半分（1個）を返す。
// 1日分は 3個（#261）。バランスは調整前の仮値なので、ここだけ変えれば全体に効く。
export const STONES_PER_DAY = 3;
export const PULL_COST = 2;
export const DUPLICATE_REFUND = 1;
// 久しぶりに開いても石が溜まりすぎないようにする（溜め込み前提の遊び方にしない）。
export const MAX_CLAIM_DAYS = 7;

export type GachaState = {
  stones: number;
  /** 石を受け取り済みの最後の日（端末ローカルの通し日番号）。null は未受け取り。 */
  lastClaimedDay: number | null;
  heads: HeadId[];
  poopms: string[];
};

export const EMPTY_GACHA_STATE: GachaState = { stones: 0, lastClaimedDay: null, heads: [], poopms: [] };

/**
 * 記録のあった日ごとに、翌日以降の最初の起動で石を渡す。今日の記録は数えない
 * （game-design.md: 当日の記録は反映せず、翌日以降に反映する）。
 */
export function claimStones(state: GachaState, loggedAt: readonly (string | Date)[], now: Date): GachaState {
  const today = toLocalDayNumber(now);
  const claimedUntil = state.lastClaimedDay ?? Number.NEGATIVE_INFINITY;
  const days = new Set<number>();
  for (const value of loggedAt) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    const day = toLocalDayNumber(date);
    if (day > claimedUntil && day < today) days.add(day);
  }
  const grantedDays = Math.min(days.size, MAX_CLAIM_DAYS);
  return { ...state, stones: state.stones + grantedDays * STONES_PER_DAY, lastClaimedDay: today - 1 };
}

/** 開発用。日をまたがず石だけを足す（受け取り済みの日は動かさない）。 */
export function addStones(state: GachaState, amount: number): GachaState {
  return { ...state, stones: state.stones + amount };
}

export type PullResult =
  | { status: "insufficient" }
  | { status: "ok"; state: GachaState; item: GachaItem; isDuplicate: boolean };

/** `random` は [0, 1) を返す。テストで差し替えるため引数にしている。 */
export function pullGacha(state: GachaState, random: () => number): PullResult {
  if (state.stones < PULL_COST) return { status: "insufficient" };

  const item = drawItem(random);
  const isDuplicate = item.kind === "head" ? state.heads.includes(item.head) : state.poopms.includes(item.characterId);
  const stones = state.stones - PULL_COST + (isDuplicate ? DUPLICATE_REFUND : 0);
  const next: GachaState = { ...state, stones };
  if (!isDuplicate) {
    if (item.kind === "head") next.heads = [...state.heads, item.head];
    else next.poopms = [...state.poopms, item.characterId];
  }
  return { status: "ok", state: next, item, isDuplicate };
}

function drawItem(random: () => number): GachaItem {
  const roll = random();
  if (roll < POOPM_CHANCE) {
    return { kind: "poopm", characterId: pick(GACHA_POOPMS, roll / POOPM_CHANCE) };
  }
  return { kind: "head", head: pick(GACHA_HEADS, (roll - POOPM_CHANCE) / (1 - POOPM_CHANCE)) };
}

// 区間 [0,1) の値を等確率で配列の要素に割り当てる。1 に丸まっても末尾で止める。
function pick<T>(items: readonly T[], unit: number): T {
  return items[Math.min(items.length - 1, Math.floor(unit * items.length))];
}
