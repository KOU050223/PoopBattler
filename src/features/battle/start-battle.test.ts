import { describe, expect, it, vi } from "vitest";

import {
  AUTO_ATTACK_DAMAGE,
  BASE_SPEED,
  INITIAL_ENEMY_HP,
  RENTAL_HP,
  RENTAL_POWER,
  RENTAL_SPEED,
} from "./battle.constants";
import {
  startBattle,
  type CharacterRow,
  type StartBattleGateway,
  type StartedBattleRow,
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

// start_battle RPC が返す行。ステータスはサーバーが確定させるので、
// テストでも「サーバーが返した値」として組み立てる。
function startedBattleRow(
  overrides: Partial<StartedBattleRow> = {},
): StartedBattleRow {
  return {
    id: "battle-1",
    enemy_character_id: "curry-poop",
    enemy_hp: INITIAL_ENEMY_HP,
    enemy_power: AUTO_ATTACK_DAMAGE,
    enemy_speed: BASE_SPEED,
    party_snapshot: [],
    resumed: false,
    ...overrides,
  };
}

// 既定は「認証済み・所持個体なし・RPCで新規開始・レンタル候補あり」の正常系。
// 各テストは検証したい部分だけを差し替える。
function createGateway(
  overrides: Partial<StartBattleGateway> = {},
): StartBattleGateway {
  return {
    getUserId: vi.fn().mockResolvedValue({ userId: "user-1", failed: false }),
    findOwnedCharacters: vi.fn().mockResolvedValue({ owned: [], failed: false }),
    startBattle: vi.fn().mockResolvedValue({
      battle: startedBattleRow(),
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
      battle: startedBattleRow(),
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
      enemyPower: AUTO_ATTACK_DAMAGE,
      enemySpeed: BASE_SPEED,
      party: [
        {
          userCharacterId: null,
          characterId: "normal-poop",
          name: "ふつうのうんちくん",
          attribute: "normal",
          hp: RENTAL_HP,
          power: RENTAL_POWER,
          speed: RENTAL_SPEED,
        },
        {
          userCharacterId: null,
          characterId: "normal-poop",
          name: "ふつうのうんちくん",
          attribute: "normal",
          hp: RENTAL_HP,
          power: RENTAL_POWER,
          speed: RENTAL_SPEED,
        },
        {
          userCharacterId: null,
          characterId: "normal-poop",
          name: "ふつうのうんちくん",
          attribute: "normal",
          hp: RENTAL_HP,
          power: RENTAL_POWER,
          speed: RENTAL_SPEED,
        },
      ],
      resumed: false,
    });
    expect(startBattleRpc).toHaveBeenCalledOnce();
  });

  it("既存のactiveバトルがあれば再開し、新しい行を作らない", async () => {
    const startBattleRpc = vi.fn().mockResolvedValue({
      battle: startedBattleRow({ id: "battle-existing", resumed: true }),
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
          battle: startedBattleRow({ id: "battle-existing", resumed: true }),
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

  it("所持個体の読み出しに失敗したらバトルを作らずに失敗を返す", async () => {
    // 失敗を「所持ゼロ」に潰すと、空のパーティでバトルが作られてしまう。
    // 以後の再試行はそのバトルを再開するだけなので、本来のパーティで
    // 戦い直せない。開始そのものを止めるのが正しい（Codex P1 指摘）。
    const startBattleRpc = vi.fn();
    const result = await startBattle(
      createGateway({
        findOwnedCharacters: vi
          .fn()
          .mockResolvedValue({ owned: [], failed: true }),
        startBattle: startBattleRpc,
      }),
    );

    expect(result.status).toBe("error");
    expect(startBattleRpc).not.toHaveBeenCalled();
  });

  it("所持個体がゼロでもレンタルで開始できる", async () => {
    // 「読み出しに失敗」と「本当に0体」は別物。後者は今までどおり進む。
    const startBattleRpc = vi.fn().mockResolvedValue({
      battle: startedBattleRow(),
      failed: false,
    });
    const result = await startBattle(
      createGateway({
        findOwnedCharacters: vi
          .fn()
          .mockResolvedValue({ owned: [], failed: false }),
        startBattle: startBattleRpc,
      }),
    );

    expect(result.status).toBe("started");
    expect(startBattleRpc).toHaveBeenCalledWith([]);
  });

  it("所持個体は最大3体まで開始RPCへ渡す", async () => {
    const startBattleRpc = vi.fn().mockResolvedValue({
      battle: startedBattleRow(),
      failed: false,
    });
    await startBattle(
      createGateway({
        findOwnedCharacters: vi.fn().mockResolvedValue({
          owned: [
            { id: "uc-1" },
            { id: "uc-2" },
            { id: "uc-3" },
            { id: "uc-4" },
          ],
          failed: false,
        }),
        startBattle: startBattleRpc,
      }),
    );

    expect(startBattleRpc).toHaveBeenCalledWith(["uc-1", "uc-2", "uc-3"]);
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
