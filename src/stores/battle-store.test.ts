import { beforeEach, describe, expect, it } from "vitest";

import { applyBattleStart } from "@/features/battle/battle-runtime";
import {
  BATTLE_SNAPSHOT_KEYS,
  IDLE_BATTLE_SNAPSHOT,
  partializeBattleStore,
} from "@/features/battle/battle-snapshot";
import {
  AUTO_ATTACK_DAMAGE,
  BASE_SPEED,
  INITIAL_ENEMY_HP,
  INITIAL_MEMBER_HP,
} from "@/features/battle/battle.constants";
import type { BattleStartInput } from "@/features/battle/battle.types";

const startInput: BattleStartInput = {
  battleId: "battle-1",
  enemy: {
    characterId: "meat-1",
    attribute: "meat",
    hp: INITIAL_ENEMY_HP,
    power: AUTO_ATTACK_DAMAGE,
    speed: BASE_SPEED,
  },
  party: [
    {
      userCharacterId: null,
      characterId: "spicy-1",
      attribute: "spicy",
      hp: INITIAL_MEMBER_HP,
      power: AUTO_ATTACK_DAMAGE,
      speed: BASE_SPEED,
    },
    {
      userCharacterId: null,
      characterId: "normal-1",
      attribute: "normal",
      hp: INITIAL_MEMBER_HP,
      power: AUTO_ATTACK_DAMAGE,
      speed: BASE_SPEED,
    },
    {
      userCharacterId: null,
      characterId: "normal-2",
      attribute: "normal",
      hp: INITIAL_MEMBER_HP,
      power: AUTO_ATTACK_DAMAGE,
      speed: BASE_SPEED,
    },
  ],
  now: 0,
};

import { BATTLE_STORE_NAME, getBattleStateStorage, useBattleStore } from "./battle-store";

describe("battle snapshot persist", () => {
  it("保存対象は指定キーだけである", () => {
    const persisted = partializeBattleStore({
      ...IDLE_BATTLE_SNAPSHOT,
      status: "active",
      battleId: "battle-1",
    });

    expect(Object.keys(persisted).sort()).toEqual(
      [...BATTLE_SNAPSHOT_KEYS].sort(),
    );
    expect(persisted).not.toHaveProperty("combo");
    expect(persisted).not.toHaveProperty("comboGauge");
    expect(persisted).not.toHaveProperty("fed");
    expect(persisted).not.toHaveProperty("sensor");
    expect(persisted).not.toHaveProperty("acceleration");
    expect(persisted).not.toHaveProperty("camera");
    expect(useBattleStore.persist.getOptions().name).toBe(BATTLE_STORE_NAME);
  });

  it("window が無いとき sessionStorage を読まない", () => {
    expect(getBattleStateStorage().getItem(BATTLE_STORE_NAME)).toBeNull();
  });
});

describe("useBattleStore", () => {
  beforeEach(() => {
    useBattleStore.getState().reset();
  });

  it("start と tick がストアの指定値だけを更新する", () => {
    useBattleStore.getState().start(startInput);
    useBattleStore.getState().tick(0);

    const state = useBattleStore.getState();
    expect(state.status).toBe("active");
    expect(state.battleId).toBe("battle-1");
    expect(state.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(state).not.toHaveProperty("comboGauge");
    expect(state).not.toHaveProperty("fed");
  });

  it("restore は渡したスナップショットに置き換える", () => {
    const snapshot = applyBattleStart(startInput);
    useBattleStore.getState().restore({
      ...snapshot,
      playerGauge: 80,
      bowelDraft: { amount: "normal" },
    });

    const state = useBattleStore.getState();
    expect(state.playerGauge).toBe(80);
    expect(state.bowelDraft).toEqual({ amount: "normal" });
    expect(state.battleId).toBe("battle-1");
  });

  it("reset はバトルと未送信の排便下書きをまとめて破棄する", () => {
    useBattleStore.getState().start(startInput);
    useBattleStore.getState().setBowelDraft({
      hardness: 4,
      amount: "normal",
      color: "brown",
      ease: "easy",
    });

    useBattleStore.getState().reset();

    const state = useBattleStore.getState();
    expect(state.status).toBe("idle");
    expect(state.battleId).toBeNull();
    expect(state.bowelDraft).toBeNull();
  });
});
