import type { BowelLogDraft } from "@/features/bowel-log/bowel-log.types";
import type { Database } from "@/types/database.types";

import type {
  BattleStance,
  CharacterAttribute,
} from "./battle.constants";

export type BattleStatus = "idle" | "active" | "defeated" | "completing";

export type BattleCombatant = {
  characterId: string;
  attribute: CharacterAttribute;
  hp: number;
  // 開幕のHP。HPバーの分母に使う。個体ごとに違うので定数では出せない。
  maxHp: number;
  power: number;
  speed: number;
  name?: string;
};

export type BattleParty = [
  BattleCombatant,
  BattleCombatant,
  BattleCombatant,
];

export type BattleStartMember = {
  // 所持個体なら user_characters の行ID、レンタルなら null。
  // null であることが「所有していない＝レンタル」の判定そのもの（Issue #73）。
  userCharacterId: string | null;
  characterId: string;
  attribute: CharacterAttribute;
  hp: number;
  power: number;
  speed: number;
  name?: string;
};

export type BattleEnemyStats = {
  characterId: string;
  attribute: CharacterAttribute;
  hp: number;
  power: number;
  speed: number;
  name?: string;
};

export type BattleStartInput = {
  battleId: string;
  enemy: BattleEnemyStats;
  party: readonly [BattleStartMember, BattleStartMember, BattleStartMember];
  now?: number;
};

// 未送信の排便入力。センサー値やカメラ画像はここに足さない。
export type BowelDraft = BowelLogDraft;

export type BattleSnapshot = {
  status: BattleStatus;
  battleId: string | null;
  enemy: BattleCombatant | null;
  party: BattleParty | null;
  activeIndex: number;
  playerStance: BattleStance;
  enemyStance: BattleStance;
  playerGauge: number;
  enemyGauge: number;
  playerGuardRemainingTicks: number;
  playerGuardCooldownTicks: number;
  playerSpecialChargeTicks: number;
  enemyGuardRemainingTicks: number;
  enemyGuardCooldownTicks: number;
  enemySpecialTelegraphTicks: number;
  switchStunTicks: number;
  // 次の交代までの残りティック。硬直中は減らさない。Speed 非依存（Issue #138）。
  switchCooldownTicks: number;
  elapsedTicks: number;
  // 旧スナップショット互換のスロット。ベンチ中の必殺ゲージは持たず、常に0へ寄せる。
  benchGauges: [number, number, number];
  startedAt: number | null;
  bowelDraft: BowelDraft | null;
};

// クライアントへ返す敵の表示用情報。
// マスターの行をそのまま返さず、画面が使う項目だけに絞る（Issue #21 実装計画4）。
export type BattleEnemy = {
  characterId: string;
  name: string;
  attribute: CharacterAttribute;
  rarity: Database["public"]["Enums"]["character_rarity"];
  imageKey: string | null;
};

export type StartBattleSuccess = {
  status: "started";
  battleId: string;
  enemy: BattleEnemy;
  enemyHp: number;
  enemyPower: number;
  enemySpeed: number;
  party: [BattleStartMember, BattleStartMember, BattleStartMember];
  // 既存のactiveバトルを再開したのか、新規作成したのか。
  // 表示の出し分け用で、敵の情報の形は両者で同じ。
  resumed: boolean;
};

export type StartBattleFailure = {
  status: "error";
  message: string;
};

export type StartBattleResult = StartBattleSuccess | StartBattleFailure;
