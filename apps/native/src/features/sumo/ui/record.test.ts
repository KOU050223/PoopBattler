import { describe, expect, it, vi } from "vitest";
import { addResult, EMPTY_RECORD, formatRecord, loadRecord, parseRecord, RECORD_STORAGE_KEY, saveResult, type RecordStorage } from "./record";
import { DEFAULT_SETUP, resolveOpponent } from "./session";
import { SPECIES } from "../config";

const memoryStorage = (initial: string | null = null): RecordStorage & { value: string | null } => {
  const store = { value: initial } as RecordStorage & { value: string | null };
  store.getItem = async () => store.value;
  store.setItem = async (_key, value) => {
    store.value = value;
  };
  return store;
};

describe("parseRecord", () => {
  it("保存された勝敗を読む", () => {
    expect(parseRecord('{"wins":3,"losses":2}')).toEqual({ wins: 3, losses: 2 });
  });

  it.each([null, "", "壊れた", "{}", '{"wins":-1,"losses":0}', '{"wins":1.5,"losses":0}', '{"wins":"3","losses":0}', "null"])(
    "読めない値 %j は 0勝0敗から始める",
    (raw) => {
      expect(parseRecord(raw)).toEqual(EMPTY_RECORD);
    },
  );
});

describe("addResult / formatRecord", () => {
  it("勝てば勝ち数、負ければ負け数が増える", () => {
    expect(addResult({ wins: 1, losses: 1 }, true)).toEqual({ wins: 2, losses: 1 });
    expect(addResult({ wins: 1, losses: 1 }, false)).toEqual({ wins: 1, losses: 2 });
  });

  it("通算を日本語で表す", () => {
    expect(formatRecord({ wins: 4, losses: 2 })).toBe("通算 4勝 2敗");
  });
});

describe("saveResult / loadRecord", () => {
  it("保存済みの戦績に加えて書き戻す", async () => {
    const storage = memoryStorage('{"wins":1,"losses":0}');
    expect(await saveResult(storage, false)).toEqual({ wins: 1, losses: 1 });
    expect(JSON.parse(storage.value ?? "")).toEqual({ wins: 1, losses: 1 });
  });

  it("保存に失敗しても、加えた後の戦績を返す", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const storage: RecordStorage = { getItem: async () => null, setItem: async () => Promise.reject(new Error("full")) };
    expect(await saveResult(storage, true)).toEqual({ wins: 1, losses: 0 });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("読み込みに失敗しても 0勝0敗で続けられる", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const storage: RecordStorage = { getItem: async () => Promise.reject(new Error("io")), setItem: async () => undefined };
    expect(await loadRecord(storage)).toEqual(EMPTY_RECORD);
    warn.mockRestore();
  });

  it("保存キーはバージョン付き", () => {
    expect(RECORD_STORAGE_KEY).toBe("sumo.record.v1");
  });
});

describe("resolveOpponent", () => {
  it("おまかせでは、自分と違う種族を選ぶ", () => {
    for (const rand of [0, 0.4, 0.99]) {
      const resolved = resolveOpponent({ ...DEFAULT_SETUP, playerSpecies: SPECIES[0], isOpponentRandom: true }, () => rand);
      expect(resolved.opponentSpecies.id).not.toBe(SPECIES[0].id);
    }
  });

  it("乱数が1に近くても範囲外にならない", () => {
    const resolved = resolveOpponent({ ...DEFAULT_SETUP, isOpponentRandom: true }, () => 0.9999999);
    expect(SPECIES).toContain(resolved.opponentSpecies);
  });

  it("相手を指定しているときはそのまま", () => {
    const setup = { ...DEFAULT_SETUP, isOpponentRandom: false, opponentSpecies: SPECIES[2] };
    expect(resolveOpponent(setup, () => 0)).toBe(setup);
  });
});
