import type { StateStorage } from "zustand/middleware";
import { describe, expect, it } from "vitest";

import { applyBattleStart } from "@poopbattler/domain/battle/battle-runtime";
import { IDLE_BATTLE_SNAPSHOT } from "@poopbattler/domain/battle/battle-snapshot";
import type { BattleStartInput } from "@poopbattler/domain/battle/battle.types";

import {
  BATTLE_STORE_NAME,
  BATTLE_STORE_VERSION,
  createBattleStore,
  migrateBattleState,
} from "./battle-store-factory";

function memoryStorage(initial: Record<string, string> = {}): StateStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const member = { userCharacterId: null, characterId: "normal-poop", attribute: "normal", hp: 240, power: 20, speed: 20 } as const;
const input: BattleStartInput = {
  battleId: "battle-1",
  enemy: { characterId: "curry-poop", attribute: "curry", hp: 480, power: 26, speed: 20 },
  party: [member, member, member],
  now: 0,
};

describe("battle-store persist", () => {
  it("migrate は古いバージョンを idle スナップショットに捨てる", () => {
    expect(migrateBattleState()).toEqual(IDLE_BATTLE_SNAPSHOT);
    expect(BATTLE_STORE_VERSION).toBe(2);
  });

  it("旧バージョン(1)の保存データは復元せず idle に戻る（NaN の HP を持ち込まない）", async () => {
    const legacy = { state: { ...applyBattleStart(input), party: [{ characterId: "x", attribute: "normal", hp: 100 }] }, version: 1 };
    const storage = memoryStorage({ [BATTLE_STORE_NAME]: JSON.stringify(legacy) });
    const store = createBattleStore(storage);
    await store.persist.rehydrate();

    expect(store.getState().status).toBe("idle");
    expect(store.getState().party).toBeNull();
  });

  it("現行バージョンの保存データは復元され、アクション関数は保存対象に含まれない", async () => {
    const first = memoryStorage();
    const a = createBattleStore(first);
    a.getState().start(input);
    a.getState().tick();

    const saved = JSON.parse(first.data[BATTLE_STORE_NAME]);
    expect(saved.version).toBe(BATTLE_STORE_VERSION);
    expect(saved.state.elapsedTicks).toBe(1);
    expect(Object.keys(saved.state)).not.toContain("tick");

    const b = createBattleStore(memoryStorage({ [BATTLE_STORE_NAME]: first.data[BATTLE_STORE_NAME] }));
    await b.persist.rehydrate();
    expect(b.getState().status).toBe("active");
    expect(b.getState().battleId).toBe("battle-1");
    expect(b.getState().elapsedTicks).toBe(1);
    expect(typeof b.getState().tick).toBe("function");
  });

  it("catchUp は applyBattleTick の繰り返しで経過時間分を進める", () => {
    const store = createBattleStore(memoryStorage());
    store.getState().start(input);
    store.getState().catchUp(10 * 500, 1);
    expect(store.getState().elapsedTicks).toBe(10);
  });

  it("reset で idle に戻り、保存データも idle になる", () => {
    const storage = memoryStorage();
    const store = createBattleStore(storage);
    store.getState().start(input);
    store.getState().reset();
    expect(store.getState().status).toBe("idle");
    expect(JSON.parse(storage.data[BATTLE_STORE_NAME]).state.status).toBe("idle");
  });
});
