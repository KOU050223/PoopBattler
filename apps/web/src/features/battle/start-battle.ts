import type { Database } from "@/types/database.types";

import { FALLBACK_ATTRIBUTE, PARTY_SIZE } from "./battle.constants";
import { fillParty, fillRentalParty, toStartMember } from "./rental-party";
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

// 選出候補の所持個体。ここで読むのは行IDだけで、3値は読まない。
// クライアントが読んだ値を開始に渡すと、改ざんの余地を作ることになる。
// 実際に使う3値はサーバーが user_characters から読んで party_snapshot に載せる。
export type OwnedCharacterRow = Pick<
  Database["public"]["Tables"]["user_characters"]["Row"],
  "id"
>;

// サーバーが確定させたパーティ1体分。start_battle RPC の party_snapshot の要素。
export type PartySnapshotMember = {
  user_character_id: string | null;
  character_id: string;
  attribute: CharacterRow["attribute"];
  name?: string | null;
  hp: number;
  power: number;
  speed: number;
};

export type StartedBattleRow = {
  id: string;
  enemy_character_id: string;
  enemy_hp: number;
  enemy_power: number;
  enemy_speed: number;
  party_snapshot: PartySnapshotMember[];
  resumed: boolean;
};

// Supabaseクライアントそのものではなく、この機能が必要とする操作だけを受け取る。
// lib/supabase/anonymous-session.ts と同じ方針で、Docker無しでも分岐を検証できる。
export type StartBattleGateway = {
  getUserId: () => Promise<{ userId: string | null; failed: boolean }>;
  findOwnedCharacters: () => Promise<{
    owned: OwnedCharacterRow[];
    failed: boolean;
  }>;
  startBattle: (userCharacterIds: string[]) => Promise<{
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * 開始に使う所持個体IDだけを残す。3値や余計なフィールドはここで捨てる。
 *
 * クライアントは user_characters.id 以外を指定できない（Issue #73 / #108）。
 */
export function readStartBattleUserCharacterIds(input: unknown): string[] {
  if (!input || typeof input !== "object") {
    return [];
  }

  const ids = (input as { userCharacterIds?: unknown }).userCharacterIds;
  if (!Array.isArray(ids)) {
    return [];
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of ids) {
    if (!isUuid(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    unique.push(item);
    if (unique.length >= PARTY_SIZE) {
      break;
    }
  }
  return unique;
}

function selectedOwnedIds(ids: readonly string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (id.length === 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    unique.push(id);
    if (unique.length >= PARTY_SIZE) {
      break;
    }
  }
  return unique;
}

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

async function loadRentals(
  gateway: StartBattleGateway,
  fallbackCharacter: CharacterRow | null,
): Promise<BattleStartMember[]> {
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

  return [];
}

/**
 * サーバーが確定させたパーティを、そのまま選出結果として使う。
 *
 * クライアントが送った所持個体IDのうち、本人の行だけがここに返ってくる。
 * 3値もサーバーの値なので、クライアント側の推測で埋め直さない（Issue #73）。
 */
function toOwnedPartyFromSnapshot(
  snapshot: readonly PartySnapshotMember[],
): BattleStartMember[] {
  return snapshot.map((member) => ({
    userCharacterId: member.user_character_id,
    characterId: member.character_id,
    attribute: member.attribute,
    name: member.name ?? undefined,
    hp: member.hp,
    power: member.power,
    speed: member.speed,
  }));
}

/**
 * バトル開始の本体。敵はサーバーで確定し、クライアントは指定できない（Issue #21）。
 *
 * 既にactiveなバトルがある場合は新規作成せず再開する（MVPの方針）。
 * 戻り値の形は新規・再開で同じにし、クライアントに区別を強いない。
 *
 * 選出する所持個体のIDだけはクライアントから渡す。3値は渡さず、サーバーが
 * 本人の user_characters の行から読んで確定させる（Issue #73 / #108）。
 *
 * IDが空のときは、インベントリ未訪問向けに新しい順の所持個体を使う。
 */
export async function startBattle(
  gateway: StartBattleGateway,
  userCharacterIds: readonly string[] = [],
): Promise<StartBattleResult> {
  const { userId, failed: authFailed } = await gateway.getUserId();

  if (authFailed || !userId) {
    return { status: "error", message: AUTH_ERROR };
  }

  const selectedIds = selectedOwnedIds(userCharacterIds);
  let ownedIds = selectedIds;

  // 選出がまだ無いときだけ、所持個体を新しい順に最大3体使う。
  // 読み出しに失敗したら開始しない。失敗を「所持ゼロ」に潰すと、空の
  // party_snapshot でバトルが作られてしまう。以後の再試行はそのバトルを
  // 再開するだけなので、本来のパーティで戦い直せない（エラーも出ないまま
  // レンタルに置き換わる）。レンタルは候補が無いときの穴埋めであって、
  // 通信失敗の代替ではない。
  if (ownedIds.length === 0) {
    const { owned, failed: ownedFailed } = await gateway.findOwnedCharacters();
    if (ownedFailed) {
      return { status: "error", message: START_ERROR };
    }
    ownedIds = owned.slice(0, PARTY_SIZE).map((row) => row.id);
  }

  // active行の検索・敵選定・INSERTは start_battle RPC だけが行う。
  const { battle, failed: startFailed } = await gateway.startBattle(ownedIds);
  if (startFailed || !battle) {
    return { status: "error", message: START_ERROR };
  }

  const { character, failed: characterFailed } =
    await gateway.findCharacterById(battle.enemy_character_id);
  if (characterFailed || !character) {
    return { status: "error", message: START_ERROR };
  }

  const ownedParty = toOwnedPartyFromSnapshot(battle.party_snapshot);
  const rentals =
    ownedParty.length >= PARTY_SIZE
      ? []
      : await loadRentals(gateway, character);

  const party = fillParty(ownedParty, rentals);
  if (!party) {
    return { status: "error", message: START_ERROR };
  }

  return {
    status: "started",
    battleId: battle.id,
    enemy: toEnemy(character),
    enemyHp: battle.enemy_hp,
    enemyPower: battle.enemy_power,
    enemySpeed: battle.enemy_speed,
    party,
    resumed: battle.resumed,
  };
}
