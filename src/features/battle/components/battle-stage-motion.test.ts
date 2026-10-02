import { describe, expect, it } from "vitest";

import {
  advanceBattleStage,
  initialBattleStageState,
  reduceBattleStage,
  type BattleStageObservation,
  type BattleStageState,
} from "@/features/battle/components/battle-stage-motion";

const BASE: BattleStageObservation = {
  status: "active",
  playerStance: "fight",
  enemyStance: "fight",
  activeIndex: 0,
  playerHp: 240,
  enemyHp: 480,
  partyHp: [240, 240, 240],
};

function reduce(
  state: BattleStageState,
  patch: Partial<BattleStageObservation>,
): BattleStageState {
  return reduceBattleStage(state, { ...BASE, ...patch });
}

function startedState(): BattleStageState {
  return reduceBattleStage(initialBattleStageState(), BASE);
}

describe("reduceBattleStage", () => {
  it("初回観測では idle で始まり displayedIndex を同期する", () => {
    const state = reduceBattleStage(initialBattleStageState(), {
      ...BASE,
      activeIndex: 2,
    });
    expect(state.player.name).toBe("idle");
    expect(state.enemy.name).toBe("idle");
    expect(state.displayedIndex).toBe(2);
  });

  it("敵HP減少 → 敵 hit + 味方 attack", () => {
    const prev = startedState();
    const next = reduce(prev, { enemyHp: 460 });
    expect(next.enemy.name).toBe("hit");
    expect(next.player.name).toBe("attack");
    expect(next.enemy.nonce).toBe(prev.enemy.nonce + 1);
  });

  it("味方HP減少 → 味方 hit + 敵 attack", () => {
    const next = reduce(startedState(), {
      playerHp: 220,
      partyHp: [220, 240, 240],
    });
    expect(next.player.name).toBe("hit");
    expect(next.enemy.name).toBe("attack");
  });

  it("連続ヒットは nonce が進んで再トリガーされる", () => {
    const first = reduce(startedState(), { enemyHp: 460 });
    const second = reduceBattleStage(first, { ...BASE, enemyHp: 440 });
    expect(second.enemy.name).toBe("hit");
    expect(second.enemy.nonce).toBe(first.enemy.nonce + 1);
  });

  it("味方の必殺チャージ → special_charge、発射（敵HP減と同時にstance解除）→ special_fire", () => {
    const charging = reduce(startedState(), { playerStance: "special" });
    expect(charging.player.name).toBe("special_charge");

    const fired = reduceBattleStage(charging, {
      ...BASE,
      playerStance: "fight",
      enemyHp: 440,
    });
    expect(fired.player.name).toBe("special_fire");
    expect(fired.enemy.name).toBe("hit");
  });

  it("チャージが発射なしで解除されたら idle に戻る", () => {
    const charging = reduce(startedState(), { playerStance: "special" });
    const cancelled = reduceBattleStage(charging, BASE);
    expect(cancelled.player.name).toBe("idle");
  });

  it("敵の必殺: チャージ → 着弾時に敵 special_fire + 味方 hit", () => {
    const telegraph = reduce(startedState(), { enemyStance: "special" });
    expect(telegraph.enemy.name).toBe("special_charge");

    const landed = reduceBattleStage(telegraph, {
      ...BASE,
      playerHp: 200,
      partyHp: [200, 240, 240],
    });
    expect(landed.enemy.name).toBe("special_fire");
    expect(landed.player.name).toBe("hit");
  });

  it("通常交代 → swap_in で表示メンバーが即座に切り替わる", () => {
    const next = reduce(startedState(), { activeIndex: 1 });
    expect(next.player.name).toBe("swap_in");
    expect(next.displayedIndex).toBe(1);
    expect(next.playerQueue).toEqual([]);
  });

  it("戦闘不能での交代 → ko →（終了後）swap_in、その間は退場メンバーを表示", () => {
    const koed = reduce(startedState(), {
      activeIndex: 1,
      partyHp: [0, 240, 240],
    });
    expect(koed.player.name).toBe("ko");
    expect(koed.displayedIndex).toBe(0);
    expect(koed.playerQueue).toEqual(["swap_in"]);

    const swapped = advanceBattleStage(koed, "player");
    expect(swapped.player.name).toBe("swap_in");
    expect(swapped.displayedIndex).toBe(1);
    expect(swapped.playerQueue).toEqual([]);
  });

  it("敗北 → 味方 lose + 敵 win で以降凍結", () => {
    const defeated = reduce(startedState(), {
      status: "defeated",
      playerHp: 0,
      partyHp: [0, 0, 0],
    });
    expect(defeated.player.name).toBe("lose");
    expect(defeated.enemy.name).toBe("win");

    const after = reduceBattleStage(defeated, {
      ...BASE,
      status: "defeated",
      playerHp: 0,
      enemyHp: 100,
      partyHp: [0, 0, 0],
    });
    expect(after.player.name).toBe("lose");
    expect(after.enemy.name).toBe("win");
  });

  it("勝利（completing）→ 味方 win + 敵 ko", () => {
    const completed = reduce(startedState(), {
      status: "completing",
      enemyHp: 0,
    });
    expect(completed.player.name).toBe("win");
    expect(completed.enemy.name).toBe("ko");
  });

  it("勝敗確定と同じ tick のHP変動は演出を上書きしない", () => {
    // 必殺でとどめ: stance解除と敵HP0とcompletingが同時に来る
    const charging = reduce(startedState(), { playerStance: "special" });
    const completed = reduceBattleStage(charging, {
      ...BASE,
      status: "completing",
      playerStance: "fight",
      enemyHp: 0,
    });
    expect(completed.player.name).toBe("win");
    expect(completed.enemy.name).toBe("ko");
  });
});

describe("advanceBattleStage", () => {
  it("1回再生の終了後は基底モーション（idle）へ戻る", () => {
    const hit = reduce(startedState(), { enemyHp: 460 });
    expect(hit.player.name).toBe("attack");

    const settled = advanceBattleStage(hit, "player");
    expect(settled.player.name).toBe("idle");
  });

  it("チャージ中に再生中の once が終わっても special_charge に戻る", () => {
    const charging = reduce(startedState(), { playerStance: "special" });
    // 直前の once が残っていた想定でも基底はチャージ
    const withOnce: BattleStageState = {
      ...charging,
      player: { name: "attack", nonce: 9 },
    };
    const settled = advanceBattleStage(withOnce, "player");
    expect(settled.player.name).toBe("special_charge");
  });

  it("勝利後の win 終了では同じモーションを維持する（nonce不変）", () => {
    const completed = reduce(startedState(), {
      status: "completing",
      enemyHp: 0,
    });
    const settled = advanceBattleStage(completed, "player");
    expect(settled.player.name).toBe("win");
    expect(settled.player.nonce).toBe(completed.player.nonce);
  });
});
