import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";
import type { BattleStance } from "@/features/battle/battle.constants";
import type {
  BattleSnapshot,
  BattleStatus,
} from "@/features/battle/battle.types";

// ステージへ渡す再生要求。nonce は同名モーションを再トリガーするための番号で、
// 命令が出るたびに増える（prop が変わらないとクリップが再生され直さないため）。
export type BattleStageMotion = {
  name: Poopm3DBattleMotion;
  nonce: number;
};

// スナップショットからモーション決定に必要な分だけ抜き出した観測。
// three や React に依存しない形にして、差分 → モーションの対応をそのままテストする。
export type BattleStageObservation = {
  status: BattleStatus;
  playerStance: BattleStance;
  enemyStance: BattleStance;
  activeIndex: number;
  // 場に出ている味方のHP。activeIndex 変化後は新しいメンバーの値。
  playerHp: number | null;
  enemyHp: number | null;
  // 全メンバーのHP。退場したメンバーが戦闘不能で退場したかの判定に使う。
  partyHp: readonly number[];
};

export type BattleStageState = {
  player: BattleStageMotion;
  enemy: BattleStageMotion;
  // ko のあとに swap_in を続けるための、味方側の1回再生キュー。
  playerQueue: Poopm3DBattleMotion[];
  // 戦闘不能での交代時は ko 再生中に退場したメンバーを表示し続け、
  // swap_in の再生開始で activeIndex に追いつく。
  displayedIndex: number;
  observed: BattleStageObservation | null;
};

function isTerminalStatus(status: BattleStatus): boolean {
  return status === "defeated" || status === "completing";
}

function issue(current: BattleStageMotion, name: Poopm3DBattleMotion) {
  return { name, nonce: current.nonce + 1 };
}

function baseMotion(
  observed: BattleStageObservation | null,
  side: "player" | "enemy",
): Poopm3DBattleMotion {
  if (!observed) return "idle";
  if (observed.status === "defeated") return side === "player" ? "lose" : "win";
  if (observed.status === "completing") {
    return side === "player" ? "win" : "ko";
  }
  const stance = side === "player" ? observed.playerStance : observed.enemyStance;
  return stance === "special" ? "special_charge" : "idle";
}

// バトルスナップショットから観測を取り出す。
export function observeBattleStage(
  state: BattleSnapshot,
): BattleStageObservation {
  return {
    status: state.status,
    playerStance: state.playerStance,
    enemyStance: state.enemyStance,
    activeIndex: state.activeIndex,
    playerHp: state.party?.[state.activeIndex]?.hp ?? null,
    enemyHp: state.enemy?.hp ?? null,
    partyHp: state.party?.map((member) => member.hp) ?? [],
  };
}

export function initialBattleStageState(): BattleStageState {
  return {
    player: { name: "idle", nonce: 0 },
    enemy: { name: "idle", nonce: 0 },
    playerQueue: [],
    displayedIndex: 0,
    observed: null,
  };
}

// 前回の観測との差分から次のモーションを決める。
export function reduceBattleStage(
  state: BattleStageState,
  observed: BattleStageObservation,
): BattleStageState {
  const prev = state.observed;
  const next: BattleStageState = { ...state, observed };
  if (!prev) {
    next.displayedIndex = observed.activeIndex;
    return next;
  }

  // 勝敗への遷移を最優先し、以降の差分は見ない。
  if (observed.status !== prev.status && isTerminalStatus(observed.status)) {
    next.player = issue(state.player, baseMotion(observed, "player"));
    next.enemy = issue(state.enemy, baseMotion(observed, "enemy"));
    next.playerQueue = [];
    return next;
  }
  if (isTerminalStatus(observed.status)) {
    return next;
  }

  const enemyDropped =
    observed.enemyHp !== null &&
    prev.enemyHp !== null &&
    observed.enemyHp < prev.enemyHp;
  const playerDropped =
    observed.activeIndex === prev.activeIndex &&
    observed.playerHp !== null &&
    prev.playerHp !== null &&
    observed.playerHp < prev.playerHp;

  if (observed.activeIndex !== prev.activeIndex) {
    const departedHp = observed.partyHp[prev.activeIndex] ?? 1;
    if (departedHp <= 0) {
      // 戦闘不能による交代。先に退場側の ko を見せ、終了後に swap_in する。
      next.player = issue(state.player, "ko");
      next.playerQueue = ["swap_in"];
    } else {
      next.player = issue(state.player, "swap_in");
      next.playerQueue = [];
      next.displayedIndex = observed.activeIndex;
    }
    // 交代と同じ tick の敵被弾は敵側だけ反映する。
    if (enemyDropped) {
      next.enemy = issue(state.enemy, "hit");
    }
    return next;
  }

  if (enemyDropped) {
    next.enemy = issue(state.enemy, "hit");
    // 味方の必殺着弾では攻撃ではなく発射モーションを見せる。
    next.player = issue(
      state.player,
      prev.playerStance === "special" ? "special_fire" : "attack",
    );
  }
  if (playerDropped) {
    next.player = issue(state.player, "hit");
    next.enemy = issue(
      state.enemy,
      prev.enemyStance === "special" ? "special_fire" : "attack",
    );
  }

  // 構えの変化。必殺発射での stance 変化は被弾ルールが先に拾うので、
  // ここに来るのはチャージ開始・解除（タイムアウト/まもれ切替）だけ。
  if (!enemyDropped && observed.playerStance !== prev.playerStance) {
    next.player = issue(
      state.player,
      observed.playerStance === "special" ? "special_charge" : "idle",
    );
  }
  if (!playerDropped && observed.enemyStance !== prev.enemyStance) {
    next.enemy = issue(
      state.enemy,
      observed.enemyStance === "special" ? "special_charge" : "idle",
    );
  }

  return next;
}

// 1回再生クリップの終了通知。キューが残っていれば次を流し、
// なければ直近の観測から決まる基底モーションへ戻す。
// 終端モーション（ko 後の swap_in 待ち、勝敗演出）は基底と同名になるため
// そのまま保持される。
export function advanceBattleStage(
  state: BattleStageState,
  side: "player" | "enemy",
): BattleStageState {
  if (side === "player" && state.playerQueue.length > 0) {
    const [head, ...rest] = state.playerQueue;
    const next: BattleStageState = {
      ...state,
      player: issue(state.player, head),
      playerQueue: rest,
    };
    if (head === "swap_in" && state.observed) {
      next.displayedIndex = state.observed.activeIndex;
    }
    return next;
  }

  const current = side === "player" ? state.player : state.enemy;
  const base = baseMotion(state.observed, side);
  if (current.name === base) {
    return state;
  }
  return side === "player"
    ? { ...state, player: issue(current, base) }
    : { ...state, enemy: issue(current, base) };
}
