import { describe, expect, it } from "vitest";

import { ENEMY_ATTRIBUTES } from "./battle.constants";
import { selectCharacterFrom, selectEnemyAttribute } from "./enemy-generator";

describe("selectEnemyAttribute", () => {
  // 「全属性が出る」だけの検査は、定数を返す実装でも通り得る。
  // 特定の乱数値に対して特定の属性を要求し、対応関係そのものを固定する。
  it("乱数値と属性の対応が定数の並び順どおりである", () => {
    ENEMY_ATTRIBUTES.forEach((expected, index) => {
      // 各区間の中央を突く値。境界の丸め方に依存しない。
      const value = (index + 0.5) / ENEMY_ATTRIBUTES.length;

      expect(selectEnemyAttribute(() => value)).toBe(expected);
    });
  });

  it("食事ログを参照せず、7属性すべてが抽選対象に含まれる", () => {
    const seen = new Set(
      Array.from({ length: ENEMY_ATTRIBUTES.length }, (_, index) =>
        selectEnemyAttribute(() => index / ENEMY_ATTRIBUTES.length),
      ),
    );

    expect(seen.size).toBe(ENEMY_ATTRIBUTES.length);
    expect([...seen].sort()).toEqual([...ENEMY_ATTRIBUTES].sort());
  });

  it("乱数が上端の1を返しても配列外にならない", () => {
    expect(selectEnemyAttribute(() => 1)).toBe(
      ENEMY_ATTRIBUTES[ENEMY_ATTRIBUTES.length - 1],
    );
  });

  it("乱数が0のとき先頭の属性を返す", () => {
    expect(selectEnemyAttribute(() => 0)).toBe(ENEMY_ATTRIBUTES[0]);
  });
});

describe("selectCharacterFrom", () => {
  it("候補が空なら null を返す", () => {
    expect(selectCharacterFrom([], () => 0)).toBeNull();
  });

  it("乱数値に対応する候補を返す", () => {
    const candidates = ["a", "b", "c"];

    expect(selectCharacterFrom(candidates, () => 0)).toBe("a");
    expect(selectCharacterFrom(candidates, () => 0.5)).toBe("b");
    expect(selectCharacterFrom(candidates, () => 0.99)).toBe("c");
  });

  it("乱数が1でも配列外にならない", () => {
    expect(selectCharacterFrom(["a", "b"], () => 1)).toBe("b");
  });
});
