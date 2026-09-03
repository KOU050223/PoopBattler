import {
  GUARD_COOLDOWN_MS,
  PARTY_SIZE,
  SPECIAL_GAUGE_MAX,
  SPECIAL_GAUGE_PER_TICK,
  SWITCH_STUN_MS,
  TIMEOUT_TICKS,
  autoAttackPeriodTicks,
  computeAttackDamage,
  msToTicks,
  shouldAutoAttack,
  type BattleStance,
} from "./battle.constants";
import {
  cloneBattleSnapshot,
  IDLE_BATTLE_SNAPSHOT,
  isFighting,
} from "./battle-snapshot";
import type {
  BattleCombatant,
  BattleParty,
  BattleSnapshot,
  BattleStartInput,
} from "./battle.types";

function nextLivingIndex(
  party: BattleParty,
  activeIndex: number,
): number | null {
  for (let step = 1; step < PARTY_SIZE; step += 1) {
    const index = (activeIndex + step) % PARTY_SIZE;
    if (party[index].hp > 0) {
      return index;
    }
  }

  return null;
}

function resolveByRemainingHp(state: BattleSnapshot): BattleSnapshot {
  if (!state.party || !state.enemy) {
    return { ...state, status: "defeated" };
  }

  // 個体ごとにHPが違うので、生のHP合計を敵HPと比べると個体値がそのまま
  // 勝敗の下駄になる。残量の割合で比べる（Issue #73 でしきい値が動いた点）。
  const partyHp = state.party.reduce((sum, member) => sum + member.hp, 0);
  const partyMaxHp = state.party.reduce((sum, member) => sum + member.maxHp, 0);
  const partyRatio = partyMaxHp > 0 ? partyHp / partyMaxHp : 0;
  const enemyRatio = state.enemy.maxHp > 0 ? state.enemy.hp / state.enemy.maxHp : 0;

  return {
    ...state,
    status: partyRatio >= enemyRatio ? "completing" : "defeated",
    playerStance: "fight",
    enemyStance: "fight",
    playerSpecialChargeTicks: 0,
    enemySpecialTelegraphTicks: 0,
  };
}

function applyKnockout(state: BattleSnapshot): BattleSnapshot {
  if (!isFighting(state)) {
    return state;
  }

  if (state.enemy.hp <= 0) {
    return {
      ...state,
      enemy: { ...state.enemy, hp: 0 },
      status: "completing",
      playerStance: "fight",
      enemyStance: "fight",
      playerSpecialChargeTicks: 0,
      enemySpecialTelegraphTicks: 0,
    };
  }

  if (state.party[state.activeIndex].hp > 0) {
    return state;
  }

  const nextIndex = nextLivingIndex(state.party, state.activeIndex);
  if (nextIndex === null) {
    return {
      ...state,
      status: "defeated",
      playerStance: "fight",
      playerSpecialChargeTicks: 0,
    };
  }

  return {
    ...state,
    activeIndex: nextIndex,
    switchStunTicks: msToTicks(SWITCH_STUN_MS),
    playerGauge: 0,
    playerStance: "fight",
    playerSpecialChargeTicks: 0,
    playerGuardRemainingTicks: 0,
  };
}

export function dealDamage(
  state: BattleSnapshot,
  source: "player" | "enemy",
  isSpecial: boolean,
): BattleSnapshot {
  if (!isFighting(state)) {
    return state;
  }

  const next = cloneBattleSnapshot(state);
  if (!next.party || !next.enemy) {
    return next;
  }

  const member = next.party[next.activeIndex];

  // 必殺は Power に乗せない。SPECIAL_BASE_DAMAGE (4) × 倍率 (10) のまま据え置き、
  // Power が効くのは通常攻撃だけにする（Issue #73 / docs/battle.md）。
  // Power を必殺にも掛けると倍率10がそのまま乗り、伸びが跳ね上がるため。
  if (source === "player") {
    next.enemy.hp = Math.max(
      0,
      next.enemy.hp -
        computeAttackDamage({
          attackerAttribute: member.attribute,
          defenderAttribute: next.enemy.attribute,
          attackerStance: isSpecial ? "fight" : next.playerStance,
          defenderStance: next.enemyStance,
          isSpecial,
          ...(isSpecial ? {} : { baseDamage: member.power }),
        }),
    );
  } else {
    member.hp = Math.max(
      0,
      member.hp -
        computeAttackDamage({
          attackerAttribute: next.enemy.attribute,
          defenderAttribute: member.attribute,
          attackerStance: isSpecial ? "fight" : next.enemyStance,
          defenderStance: next.playerStance,
          isSpecial,
          ...(isSpecial ? {} : { baseDamage: next.enemy.power }),
        }),
    );
  }

  return applyKnockout(next);
}

function decrementGuard(
  stance: BattleStance,
  remaining: number,
  cooldown: number,
): { stance: BattleStance; remaining: number; cooldown: number } {
  if (stance === "guard") {
    const nextRemaining = remaining - 1;
    if (nextRemaining <= 0) {
      return {
        stance: "fight",
        remaining: 0,
        cooldown: msToTicks(GUARD_COOLDOWN_MS),
      };
    }

    return { stance, remaining: nextRemaining, cooldown };
  }

  return {
    stance,
    remaining: 0,
    cooldown: Math.max(0, cooldown - 1),
  };
}

// 開幕のHPは個体のHP。最大値も同じ値を持ち回す（HPバーの分母になる）。
function toCombatant(member: BattleStartInput["party"][number]): BattleCombatant {
  return {
    characterId: member.characterId,
    attribute: member.attribute,
    name: member.name,
    hp: member.hp,
    maxHp: member.hp,
    power: member.power,
    speed: member.speed,
  };
}

export function applyBattleStart(input: BattleStartInput): BattleSnapshot {
  return {
    ...IDLE_BATTLE_SNAPSHOT,
    status: "active",
    battleId: input.battleId,
    enemy: {
      characterId: input.enemy.characterId,
      attribute: input.enemy.attribute,
      name: input.enemy.name,
      hp: input.enemy.hp,
      maxHp: input.enemy.hp,
      power: input.enemy.power,
      speed: input.enemy.speed,
    },
    party: [
      toCombatant(input.party[0]),
      toCombatant(input.party[1]),
      toCombatant(input.party[2]),
    ],
    activeIndex: 0,
    startedAt: input.now ?? Date.now(),
  };
}

export function applyBattleTick(state: BattleSnapshot): BattleSnapshot {
  if (!isFighting(state)) {
    return state;
  }

  if ((state.elapsedTicks ?? 0) >= TIMEOUT_TICKS) {
    return resolveByRemainingHp(cloneBattleSnapshot(state));
  }

  let next = cloneBattleSnapshot(state);
  next.elapsedTicks = (next.elapsedTicks ?? 0) + 1;
  const battleId = next.battleId ?? "";
  // next は以降で再代入されるため、isFighting の絞り込みが効かない。
  // 待ちティックの元になる Speed は、この tick の開始時点の値で固定する。
  const playerSpeed = state.party[state.activeIndex].speed;
  const enemySpeed = state.enemy.speed;

  if (
    next.switchStunTicks === 0 &&
    next.playerStance === "fight" &&
    shouldAutoAttack(
      battleId,
      next.elapsedTicks,
      "player",
      autoAttackPeriodTicks(playerSpeed),
    )
  ) {
    next = dealDamage(next, "player", false);
    if (next.status !== "active") {
      return next;
    }
  }

  const activeIndexBeforeEnemy = next.activeIndex;
  if (
    next.enemyStance === "fight" &&
    shouldAutoAttack(
      battleId,
      next.elapsedTicks,
      "enemy",
      autoAttackPeriodTicks(enemySpeed),
    )
  ) {
    next = dealDamage(next, "enemy", false);
    if (next.status !== "active") {
      return next;
    }
    // 交代硬直を同じ tick で減らし始めない。ゲージも空のままにする。
    if (next.activeIndex !== activeIndexBeforeEnemy) {
      return next;
    }
  } else if (next.enemyStance === "special") {
    const remaining = next.enemySpecialTelegraphTicks - 1;
    if (remaining <= 0) {
      next = dealDamage(next, "enemy", true);
      next = {
        ...next,
        enemyStance: "fight",
        enemyGauge: 0,
        enemySpecialTelegraphTicks: 0,
      };
      if (next.status !== "active") {
        return next;
      }
      if (next.activeIndex !== activeIndexBeforeEnemy) {
        return next;
      }
    } else {
      next.enemySpecialTelegraphTicks = remaining;
    }
  }

  next.playerGauge = Math.min(
    SPECIAL_GAUGE_MAX,
    next.playerGauge + SPECIAL_GAUGE_PER_TICK,
  );
  next.enemyGauge = Math.min(
    SPECIAL_GAUGE_MAX,
    next.enemyGauge + SPECIAL_GAUGE_PER_TICK,
  );

  next.switchStunTicks = Math.max(0, next.switchStunTicks - 1);

  const playerGuard = decrementGuard(
    next.playerStance,
    next.playerGuardRemainingTicks,
    next.playerGuardCooldownTicks,
  );
  next.playerStance = playerGuard.stance;
  next.playerGuardRemainingTicks = playerGuard.remaining;
  next.playerGuardCooldownTicks = playerGuard.cooldown;

  const enemyGuard = decrementGuard(
    next.enemyStance,
    next.enemyGuardRemainingTicks,
    next.enemyGuardCooldownTicks,
  );
  next.enemyStance = enemyGuard.stance;
  next.enemyGuardRemainingTicks = enemyGuard.remaining;
  next.enemyGuardCooldownTicks = enemyGuard.cooldown;

  if (next.playerStance === "special") {
    next.playerSpecialChargeTicks -= 1;
    if (next.playerSpecialChargeTicks <= 0) {
      next.playerStance = "fight";
      next.playerSpecialChargeTicks = 0;
    }
  }

  return next;
}
