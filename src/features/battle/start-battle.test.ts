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

// 既定は「認証済み・RPCで新規開始・レンタル候補あり」の正常系。
// 各テストは検証したい部分だけを差し替える。
function createGateway(
  overrides: Partial<StartBattleGateway> = {},
): StartBattleGateway {
  return {
    getUserId: vi.fn().mockResolvedValue({ userId: "user-1", failed: false }),
    startBattle: vi.fn().mockResolvedValue({
      battle: { id: "battle-1", enemy_character_id: "curry-poop", resumed: false },
      failed: false,
    }),
    findCharacterById: vi.fn().mockResolvedValue({ character: curry, failed: false }),
    findCharactersByAttribute: vi.fn(async (attribute: CharacterRow["attribute"]) => {
      if (attribute === "normal") {
        return { characters: [normal], failed: false };
      }
      return { characters: [curry], failed: false };
    }),
    ...overrides,
  };
}

describe("startBattle", () => {
  it("食事ログが1件もなくてもバトルを開始できる", async () => {
    // 食事ログを読む口がそもそもゲートウェイに無いことが、
    // 「食事ゼロで遊べる」ことの構造的な保証になっている。
    const startBattleRpc = vi.fn().mockResolvedValue({
      battle: { id: "battle-1", enemy_character_id: "curry-poop", resumed: false },
      failed: false,
    });
    const result = await startBattle(createGateway({ startBattle: startBattleRpc }));

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
      party: [
        {
          characterId: "normal-poop",
          name: "ふつうのうんちくん",
          attribute: "normal",
        },
        {
          characterId: "normal-poop",
          name: "ふつうのうんちくん",
          attribute: "normal",
        },
        {
          characterId: "normal-poop",
          name: "ふつうのうんちくん",
          attribute: "normal",
        },
      ],
      resumed: false,
    });
    expect(startBattleRpc).toHaveBeenCalledOnce();
  });

  it("既存のactiveバトルがあれば再開し、新しい行を作らない", async () => {
    const startBattleRpc = vi.fn().mockResolvedValue({
      battle: { id: "battle-existing", enemy_character_id: "curry-poop", resumed: true },
      failed: false,
    });
    const result = await startBattle(
      createGateway({
        startBattle: startBattleRpc,
      }),
    );

    expect(result).toMatchObject({
      status: "started",
      battleId: "battle-existing",
      resumed: true,
      party: [
        expect.objectContaining({ characterId: "normal-poop" }),
        expect.objectContaining({ characterId: "normal-poop" }),
        expect.objectContaining({ characterId: "normal-poop" }),
      ],
    });
    expect(startBattleRpc).toHaveBeenCalledOnce();
  });

  it("RPCが返した敵の読み出しに失敗したら失敗を返す", async () => {
    const result = await startBattle(
      createGateway({
        startBattle: vi.fn().mockResolvedValue({
          battle: { id: "battle-existing", enemy_character_id: "curry-poop", resumed: true },
          failed: false,
        }),
        findCharacterById: vi
          .fn()
          .mockResolvedValue({ character: null, failed: true }),
      }),
    );

    expect(result.status).toBe("error");
  });

  it("未認証ならバトルを作らずに失敗を返す", async () => {
    const startBattleRpc = vi.fn();
    const result = await startBattle(
      createGateway({
        getUserId: vi.fn().mockResolvedValue({ userId: null, failed: false }),
        startBattle: startBattleRpc,
      }),
    );

    expect(result.status).toBe("error");
    expect(startBattleRpc).not.toHaveBeenCalled();
  });

  it("開始RPCが失敗したら成功を返さない", async () => {
    const result = await startBattle(
      createGateway({
        startBattle: vi.fn().mockResolvedValue({ battle: null, failed: true }),
      }),
    );

    expect(result.status).toBe("error");
  });

  it("レンタル候補の読み出しに失敗しても敵を代替パーティにする", async () => {
    const result = await startBattle(
      createGateway({
        findCharactersByAttribute: vi
          .fn()
          .mockResolvedValue({ characters: [], failed: true }),
      }),
    );

    expect(result).toMatchObject({
      status: "started",
      party: [
        expect.objectContaining({ characterId: "curry-poop" }),
        expect.objectContaining({ characterId: "curry-poop" }),
        expect.objectContaining({ characterId: "curry-poop" }),
      ],
    });
  });
});
