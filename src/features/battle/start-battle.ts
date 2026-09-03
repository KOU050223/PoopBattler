import type { Database } from "@/types/database.types";

import { FALLBACK_ATTRIBUTE, INITIAL_ENEMY_HP } from "./battle.constants";
import { fillRentalParty, toStartMember } from "./rental-party";
import type {
  BattleEnemy,
  BattleStartMember,
  StartBattleResult,
} from "./battle.types";

// 生成された型から必要な列だけを抜き出す。手書きの形にすると、列名や
// 型が変わってもコンパイルが通り、実行時に黙って壊れる（AGENTS.md）。
export type CharacterRow = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "id" | "name" | "attribute" | "rarity" | "image_key"
>;

export type StartedBattleRow = {
  id: string;
  enemy_character_id: string;
  resumed: boolean;
};

// Supabaseクライアントそのものではなく、この機能が必要とする操作だけを受け取る。
// lib/supabase/anonymous-session.ts と同じ方針で、Docker無しでも分岐を検証できる。
export type StartBattleGateway = {
  getUserId: () => Promise<{ userId: string | null; failed: boolean }>;
  startBattle: () => Promise<{
    battle: StartedBattleRow | null;
    failed: boolean;
  }>;
  findCharacterById: (
    id: string,
  ) => Promise<{ character: CharacterRow | null; failed: boolean }>;
  findCharactersByAttribute: (
    attribute: CharacterRow["attribute"],
  ) => Promise<{ characters: CharacterRow[]; failed: boolean }>;
};

const AUTH_ERROR = "プレイの準備ができていません。時間をおいて再試行してください。";
const START_ERROR = "バトルを開始できませんでした。時間をおいて再試行してください。";

function toEnemy(character: CharacterRow): BattleEnemy {
  return {
    characterId: character.id,
    name: character.name,
    attribute: character.attribute,
    rarity: character.rarity,
    imageKey: character.image_key,
  };
}

function partyFromCharacter(
  character: CharacterRow,
): [BattleStartMember, BattleStartMember, BattleStartMember] {
  const member = toStartMember(character);
  return [member, { ...member }, { ...member }];
}

async function loadRentalParty(
  gateway: StartBattleGateway,
  fallbackCharacter: CharacterRow | null,
): Promise<[BattleStartMember, BattleStartMember, BattleStartMember] | null> {
  const { characters, failed } = await gateway.findCharactersByAttribute(
    FALLBACK_ATTRIBUTE,
  );

  if (!failed) {
    const party = fillRentalParty(characters);
    if (party) {
      return party;
    }
  }

  if (fallbackCharacter) {
    return partyFromCharacter(fallbackCharacter);
  }

  return null;
}

/**
 * バトル開始の本体。敵はサーバーで確定し、クライアントは指定できない（Issue #21）。
 *
 * 既にactiveなバトルがある場合は新規作成せず再開する（MVPの方針）。
 * 戻り値の形は新規・再開で同じにし、クライアントに区別を強いない。
 */
export async function startBattle(gateway: StartBattleGateway): Promise<StartBattleResult> {
  const { userId, failed: authFailed } = await gateway.getUserId();

  if (authFailed || !userId) {
    return { status: "error", message: AUTH_ERROR };
  }

  // active行の検索・敵選定・INSERTは start_battle RPC だけが行う。
  const { battle, failed: startFailed } = await gateway.startBattle();
  if (startFailed || !battle) {
    return { status: "error", message: START_ERROR };
  }

  const { character, failed: characterFailed } =
    await gateway.findCharacterById(battle.enemy_character_id);
  if (characterFailed || !character) {
    return { status: "error", message: START_ERROR };
  }

  const party = await loadRentalParty(gateway, character);
  if (!party) {
    return { status: "error", message: START_ERROR };
  }

  return {
    status: "started",
    battleId: battle.id,
    enemy: toEnemy(character),
    enemyHp: INITIAL_ENEMY_HP,
    party,
    resumed: battle.resumed,
  };
}
