import { beforeEach, describe, expect, it } from "vitest";

import {
  GUARD_COOLDOWN_MS,
  GUARD_DURATION_MS,
  INITIAL_ENEMY_HP,
  INITIAL_MEMBER_HP,
  PLAYER_SPECIAL_CHARGE_MS,
  SPECIAL_GAUGE_MAX,
  SPECIAL_GAUGE_PER_TICK,
  SWITCH_STUN_MS,
  TIMEOUT_MS,
  computeAttackDamage,
  msToTicks,
} from "@/features/battle/battle.constants";
import type {
  BattleSnapshot,
  BattleStartInput,
} from "@/features/battle/battle.types";

import {
  BATTLE_SNAPSHOT_KEYS,
  BATTLE_STORE_NAME,
  IDLE_BATTLE_SNAPSHOT,
  applyBattleStart,
  applyBattleTick,
  applyBeginSpecial,
  applyFireSpecial,
  applyMarkDefeated,
  applySetBowelDraft,
  applySetStance,
  applySwitchMember,
  getBattleStateStorage,
  partializeBattleStore,
  useBattleStore,
} from "./battle-store";

const startInput: BattleStartInput = {
  battleId: "battle-1",
  enemy: { characterId: "meat-1", attribute: "meat" },
  party: [
    { characterId: "spicy-1", attribute: "spicy" },
    { characterId: "normal-1", attribute: "normal" },
    { characterId: "normal-2", attribute: "normal" },
  ],
  now: 0,
};

function tickTimes(state: BattleSnapshot, count: number): BattleSnapshot {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = applyBattleTick(next, 0);
  }
  return next;
}

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

describe("applyBattleStart / applyBattleTick", () => {
  it("同じ入力列なら HP・ゲージ・stance が同じ結果になる", () => {
    const first = tickTimes(applySetStance(applyBattleStart(startInput), "guard"), 4);
    const second = tickTimes(applySetStance(applyBattleStart(startInput), "guard"), 4);

    expect(first).toEqual(second);
    expect(first.playerStance).toBe("guard");
    expect(first.playerGauge).toBe(SPECIAL_GAUGE_PER_TICK * 4);
  });

  it("有利タイプの無操作は40秒で敵を倒す", () => {
    const after = tickTimes(applyBattleStart(startInput), 80);

    expect(after.status).toBe("completing");
    expect(after.enemy?.hp).toBe(0);
  });

  it("79 tick ではまだ撃破しない", () => {
    const after = tickTimes(applyBattleStart(startInput), 79);
    const damage = computeAttackDamage({
      attackerAttribute: "spicy",
      defenderAttribute: "meat",
      attackerStance: "fight",
      defenderStance: "fight",
    });

    expect(after.status).toBe("active");
    expect(after.enemy?.hp).toBe(INITIAL_ENEMY_HP - damage * 79);
  });

  it("控えは場に出るまでダメージを受けない", () => {
    const after = tickTimes(applyBattleStart(startInput), 10);

    expect(after.party?.[0].hp).toBeLessThan(INITIAL_MEMBER_HP);
    expect(after.party?.[1].hp).toBe(INITIAL_MEMBER_HP);
    expect(after.party?.[2].hp).toBe(INITIAL_MEMBER_HP);
  });
});

describe("まもれ", () => {
  it("被ダメを半減し、自分は殴らない", () => {
    const guarding = tickTimes(
      applySetStance(applyBattleStart(startInput), "guard"),
      1,
    );

    const incomingGuard = computeAttackDamage({
      attackerAttribute: "meat",
      defenderAttribute: "spicy",
      attackerStance: "fight",
      defenderStance: "guard",
    });

    expect(INITIAL_MEMBER_HP - (guarding.party?.[0].hp ?? 0)).toBe(incomingGuard);
    expect(guarding.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(guarding.playerGuardRemainingTicks).toBe(
      msToTicks(GUARD_DURATION_MS) - 1,
    );
  });

  it("クール中はまもれに入れない", () => {
    let state = applySetStance(applyBattleStart(startInput), "guard");
    state = tickTimes(state, msToTicks(GUARD_DURATION_MS));
    expect(state.playerStance).toBe("fight");
    expect(state.playerGuardCooldownTicks).toBe(msToTicks(GUARD_COOLDOWN_MS));

    const rejected = applySetStance(state, "guard");
    expect(rejected.playerStance).toBe("fight");
    expect(rejected.playerGuardRemainingTicks).toBe(0);
  });
});

describe("必殺", () => {
  it("ゲージ不足では準備に入れない", () => {
    const started = applyBattleStart(startInput);
    const rejected = applyBeginSpecial(started);

    expect(rejected.playerStance).toBe("fight");
    expect(rejected.playerSpecialChargeTicks).toBe(0);
  });

  it("準備中に発射すると定数倍率のダメージになり、未発射ならたたかえへ戻る", () => {
    const charged = applyBeginSpecial({
      ...applyBattleStart(startInput),
      playerGauge: SPECIAL_GAUGE_MAX,
    });
    expect(charged.playerStance).toBe("special");
    expect(charged.playerSpecialChargeTicks).toBe(
      msToTicks(PLAYER_SPECIAL_CHARGE_MS),
    );

    const fired = applyFireSpecial(charged);
    const expected = computeAttackDamage({
      attackerAttribute: "spicy",
      defenderAttribute: "meat",
      attackerStance: "fight",
      defenderStance: "fight",
      isSpecial: true,
    });
    expect(fired.enemy?.hp).toBe(INITIAL_ENEMY_HP - expected);
    expect(fired.playerGauge).toBe(0);
    expect(fired.playerStance).toBe("fight");

    const expired = tickTimes(charged, msToTicks(PLAYER_SPECIAL_CHARGE_MS));
    expect(expired.playerStance).toBe("fight");
    expect(expired.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(expired.playerSpecialChargeTicks).toBe(0);
  });

  it("準備していない発射は無視する", () => {
    const started = applyBattleStart(startInput);
    const rejected = applyFireSpecial(started);
    expect(rejected.enemy?.hp).toBe(INITIAL_ENEMY_HP);
  });
});

describe("交代とKO", () => {
  it("交代でゲージを空にし、硬直中は攻撃しない", () => {
    const started = applyBattleStart(startInput);
    const withGauge = { ...started, playerGauge: 40 };
    const switched = applySwitchMember(withGauge, 1);

    expect(switched.activeIndex).toBe(1);
    expect(switched.playerGauge).toBe(0);
    expect(switched.switchStunTicks).toBe(msToTicks(SWITCH_STUN_MS));

    const afterStun = tickTimes(switched, msToTicks(SWITCH_STUN_MS));
    expect(afterStun.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(afterStun.switchStunTicks).toBe(0);
    expect(afterStun.party?.[0].hp).toBe(INITIAL_MEMBER_HP);
  });

  it("硬直中の交代は無視する", () => {
    const switched = applySwitchMember(applyBattleStart(startInput), 1);
    const rejected = applySwitchMember(switched, 2);
    expect(rejected.activeIndex).toBe(1);
  });

  it("場の一体が倒れたらベンチ先頭が出て、3体とも倒されたら敗北する", () => {
    const started = applyBattleStart(startInput);
    const firstKo = applyBattleTick(
      {
        ...started,
        party: [
          { ...started.party![0], hp: 1 },
          started.party![1],
          started.party![2],
        ],
      },
      0,
    );

    expect(firstKo.status).toBe("active");
    expect(firstKo.activeIndex).toBe(1);
    expect(firstKo.party?.[0].hp).toBe(0);
    expect(firstKo.playerGauge).toBe(0);
    expect(firstKo.switchStunTicks).toBe(msToTicks(SWITCH_STUN_MS));

    const wiped = applyBattleTick(
      {
        ...started,
        party: [
          { ...started.party![0], hp: 1 },
          { ...started.party![1], hp: 0 },
          { ...started.party![2], hp: 0 },
        ],
      },
      0,
    );
    expect(wiped.status).toBe("defeated");
  });
});

describe("タイムアップと終了", () => {
  it("残HPが多い側が勝つ", () => {
    const started = applyBattleStart(startInput);
    const won = applyBattleTick(started, TIMEOUT_MS);
    expect(won.status).toBe("completing");

    const lost = applyBattleTick(
      {
        ...started,
        party: [
          { ...started.party![0], hp: 10 },
          { ...started.party![1], hp: 0 },
          { ...started.party![2], hp: 0 },
        ],
        enemy: { ...started.enemy!, hp: 400 },
      },
      TIMEOUT_MS,
    );
    expect(lost.status).toBe("defeated");
  });

  it("markDefeated は進行中だけ敗北にする", () => {
    expect(applyMarkDefeated(IDLE_BATTLE_SNAPSHOT).status).toBe("idle");
    expect(applyMarkDefeated(applyBattleStart(startInput)).status).toBe(
      "defeated",
    );
  });

  it("排便下書きだけを保持し、reset で消える", () => {
    const withDraft = applySetBowelDraft(applyBattleStart(startInput), {
      hardness: 3,
      color: "brown",
    });
    expect(withDraft.bowelDraft).toEqual({ hardness: 3, color: "brown" });
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
    expect(state.enemy?.hp).toBeLessThan(INITIAL_ENEMY_HP);
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
});
