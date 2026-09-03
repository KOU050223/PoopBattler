import { describe, expect, it } from "vitest";

import {
  INITIAL_ENEMY_HP,
  INITIAL_MEMBER_HP,
  SPECIAL_GAUGE_PER_TICK,
  SWITCH_STUN_MS,
  TIMEOUT_MS,
  computeAttackDamage,
  msToTicks,
} from "./battle.constants";
import { applySetStance } from "./battle-commands";
import { applyBattleStart, applyBattleTick } from "./battle-runtime";
import type { BattleSnapshot, BattleStartInput } from "./battle.types";

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

  it("タイムアップは残HPが多い側が勝つ", () => {
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
});
