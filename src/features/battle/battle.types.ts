import type { Database } from "@/types/database.types";

import type { CharacterAttribute } from "./battle.constants";

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
  // 既存のactiveバトルを再開したのか、新規作成したのか。
  // 表示の出し分け用で、敵の情報の形は両者で同じ。
  resumed: boolean;
};

export type StartBattleFailure = {
  status: "error";
  message: string;
};

export type StartBattleResult = StartBattleSuccess | StartBattleFailure;
