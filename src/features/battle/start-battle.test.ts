import { describe, expect, it, vi } from "vitest";

import { INITIAL_ENEMY_HP } from "./battle.constants";
import {
  startBattle,
  type CharacterRow,
  type StartBattleGateway,
} from "./start-battle";

const curry: CharacterRow = {
  id: "curry-poop",
  name: "カレーうんちくん",
  attribute: "curry",
  rarity: "common",
  image_key: "characters/curry-poop.png",
};

const normal: CharacterRow = {
  id: "normal-poop",
  name: "ふつうのうんちくん",
  attribute: "normal",
  rarity: "common",
  image_key: "characters/normal-poop.png",
};

// 既定は「認証済み・activeなし・属性一致あり・INSERT成功」の正常系。
// 各テストは検証したい部分だけを差し替える。
function createGateway(
  overrides: Partial<StartBattleGateway> = {},
): StartBattleGateway {
  return {
    getUserId: vi.fn().mockResolvedValue({ userId: "user-1", failed: false }),
    findActiveBattle: vi.fn().mockResolvedValue({ battle: null, failed: false }),
    findCharacterById: vi.fn().mockResolvedValue({ character: curry, failed: false }),
    findCharactersByAttribute: vi
      .fn()
      .mockResolvedValue({ characters: [curry], failed: false }),
    insertBattle: vi.fn().mockResolvedValue({ battleId: "battle-1" }),
    ...overrides,
  };
}

describe("startBattle", () => {
  it("食事ログが1件もなくてもバトルを開始できる", async () => {
    // 食事ログを読む口がそもそもゲートウェイに無いことが、
    // 「食事ゼロで遊べる」ことの構造的な保証になっている。
    const insertBattle = vi.fn().mockResolvedValue({ battleId: "battle-1" });
    const result = await startBattle(createGateway({ insertBattle }), () => 0);

    expect(result).toEqual({
      status: "started",
      battleId: "battle-1",
      enemy: {
        characterId: "curry-poop",
        name: "カレーうんちくん",
        attribute: "curry",
        rarity: "common",
        imageKey: "characters/curry-poop.png",
      },
      enemyHp: INITIAL_ENEMY_HP,
      resumed: false,
    });
    expect(insertBattle).toHaveBeenCalledOnce();
  });

  it("既存のactiveバトルがあれば再開し、新しい行を作らない", async () => {
    const insertBattle = vi.fn();
    const result = await startBattle(
      createGateway({
        findActiveBattle: vi.fn().mockResolvedValue({
          battle: { id: "battle-existing", enemy_character_id: "curry-poop" },
          failed: false,
        }),
        insertBattle,
      }),
      () => 0,
    );

    expect(result).toMatchObject({
      status: "started",
      battleId: "battle-existing",
      resumed: true,
    });
    expect(insertBattle).not.toHaveBeenCalled();
  });

  it("属性に一致する敵がいなければフォールバック属性から選ぶ", async () => {
    const findCharactersByAttribute = vi
      .fn()
      .mockResolvedValueOnce({ characters: [], failed: false })
      .mockResolvedValueOnce({ characters: [normal], failed: false });

    const result = await startBattle(
      createGateway({ findCharactersByAttribute }),
      () => 0,
    );

    expect(result).toMatchObject({ status: "started", resumed: false });
    expect(findCharactersByAttribute).toHaveBeenLastCalledWith("normal");
  });

  it("再開対象の敵の読み出しに失敗したら、新規作成せず失敗を返す", async () => {
    // 読み出し失敗を「敵がいない」と誤読して新規作成に倒すと、
    // 進行中のバトルを放置したまま別のバトルができてしまう。
    const insertBattle = vi.fn();
    const result = await startBattle(
      createGateway({
        findActiveBattle: vi.fn().mockResolvedValue({
          battle: { id: "battle-existing", enemy_character_id: "curry-poop" },
          failed: false,
        }),
        findCharacterById: vi
          .fn()
          .mockResolvedValue({ character: null, failed: true }),
        insertBattle,
      }),
      () => 0,
    );

    expect(result.status).toBe("error");
    expect(insertBattle).not.toHaveBeenCalled();
  });

  it("再開対象の敵が本当に存在しなければ新規作成へ進む", async () => {
    const insertBattle = vi.fn().mockResolvedValue({ battleId: "battle-new" });
    const result = await startBattle(
      createGateway({
        findActiveBattle: vi.fn().mockResolvedValue({
          battle: { id: "battle-existing", enemy_character_id: "gone" },
          failed: false,
        }),
        findCharacterById: vi
          .fn()
          .mockResolvedValue({ character: null, failed: false }),
        insertBattle,
      }),
      () => 0,
    );

    expect(result).toMatchObject({ battleId: "battle-new", resumed: false });
    expect(insertBattle).toHaveBeenCalledOnce();
  });

  it("未認証ならバトルを作らずに失敗を返す", async () => {
    const insertBattle = vi.fn();
    const result = await startBattle(
      createGateway({
        getUserId: vi.fn().mockResolvedValue({ userId: null, failed: false }),
        insertBattle,
      }),
      () => 0,
    );

    expect(result.status).toBe("error");
    expect(insertBattle).not.toHaveBeenCalled();
  });

  it("フォールバックでも敵が見つからなければバトルを作らない", async () => {
    const insertBattle = vi.fn();
    const result = await startBattle(
      createGateway({
        findCharactersByAttribute: vi
          .fn()
          .mockResolvedValue({ characters: [], failed: false }),
        insertBattle,
      }),
      () => 0,
    );

    expect(result.status).toBe("error");
    expect(insertBattle).not.toHaveBeenCalled();
  });

  it("INSERTに失敗したら成功を返さない", async () => {
    const result = await startBattle(
      createGateway({
        insertBattle: vi.fn().mockResolvedValue({ battleId: null }),
      }),
      () => 0,
    );

    expect(result.status).toBe("error");
  });

  it("マスター読み出しに失敗したら敵を作らない", async () => {
    const insertBattle = vi.fn();
    const result = await startBattle(
      createGateway({
        findCharactersByAttribute: vi
          .fn()
          .mockResolvedValue({ characters: [], failed: true }),
        insertBattle,
      }),
      () => 0,
    );

    expect(result.status).toBe("error");
    expect(insertBattle).not.toHaveBeenCalled();
  });
});
