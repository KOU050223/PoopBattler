// 通算戦績（勝ち数・負け数）。保存先は呼び出し側から渡す（AsyncStorage の実体は record-storage.ts）。
export interface SumoRecord {
  wins: number;
  losses: number;
}

export const EMPTY_RECORD: SumoRecord = { wins: 0, losses: 0 };
export const RECORD_STORAGE_KEY = "sumo.record.v1";

export interface RecordStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;

/** 壊れた値・古い形式は 0 勝 0 敗から始め直す（戦績が読めなくても対戦は続けたい） */
export function parseRecord(raw: string | null): SumoRecord {
  if (raw === null) return EMPTY_RECORD;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "wins" in parsed && "losses" in parsed && isCount(parsed.wins) && isCount(parsed.losses)) {
      return { wins: parsed.wins, losses: parsed.losses };
    }
  } catch {
    // 下で空の戦績に戻す
  }
  return EMPTY_RECORD;
}

export const addResult = (record: SumoRecord, isWin: boolean): SumoRecord =>
  isWin ? { ...record, wins: record.wins + 1 } : { ...record, losses: record.losses + 1 };

export const formatRecord = (record: SumoRecord): string => `通算 ${record.wins}勝 ${record.losses}敗`;

export async function loadRecord(storage: RecordStorage): Promise<SumoRecord> {
  try {
    return parseRecord(await storage.getItem(RECORD_STORAGE_KEY));
  } catch (error) {
    console.warn("うんち相撲の戦績を読めませんでした:", error);
    return EMPTY_RECORD;
  }
}

/** 勝敗を加えて保存し、加えた後の戦績を返す。保存に失敗しても加えた値は返す */
export async function saveResult(storage: RecordStorage, isWin: boolean): Promise<SumoRecord> {
  const next = addResult(await loadRecord(storage), isWin);
  try {
    await storage.setItem(RECORD_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("うんち相撲の戦績を保存できませんでした:", error);
  }
  return next;
}
