import { describe, expect, it } from "vitest";

import {
  mealLogIdForComplete,
  postBattleCompleteLabel,
  postBattleMealChanceCopy,
} from "./post-battle-meal-session";

describe("mealLogIdForComplete", () => {
  it("この回の記録が無ければバトルに食事を紐付けない", () => {
    expect(mealLogIdForComplete([])).toBeNull();
  });

  it("複数枚あっても最後に記録した1件だけをガチャへ渡す", () => {
    expect(mealLogIdForComplete([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ])).toBe("00000000-0000-4000-8000-000000000002");
  });
});

describe("postBattleCompleteLabel", () => {
  it("未記録のときはスキップ文言のままにする", () => {
    expect(postBattleCompleteLabel(0)).toBe("記録せずに完了する");
  });

  it("1枚以上記録したら完了に切り替える", () => {
    expect(postBattleCompleteLabel(1)).toBe("完了する");
    expect(postBattleCompleteLabel(3)).toBe("完了する");
  });
});

describe("postBattleMealChanceCopy", () => {
  it("既存も今回も0件なら仲間化できない旨を出す", () => {
    expect(postBattleMealChanceCopy(0, 0)).toContain("食事ログがないと仲間になりません");
    expect(postBattleMealChanceCopy(0, 0)).toContain("今回記録すると50%");
    expect(postBattleMealChanceCopy(0, 0)).toContain("4件以上で90%");
  });

  it("1件なら完了時50%、もう1件で75%と出す", () => {
    expect(postBattleMealChanceCopy(1, 0)).toBe(
      "いま食事ログは1件です。完了すると50%、もう1件記録すると75%です。",
    );
  });

  it("今回の記録も件数に含めて完了時の確率を出す", () => {
    expect(postBattleMealChanceCopy(1, 1)).toBe(
      "いま食事ログは2件です。完了すると75%、もう1件記録すると85%です。",
    );
  });

  it("既存ログだけでは今回0件でも完了確率を出せる", () => {
    expect(postBattleMealChanceCopy(2, 0)).toBe(
      "いま食事ログは2件です。完了すると75%、もう1件記録すると85%です。",
    );
  });

  it("4件以上は90%で頭打ちになる", () => {
    expect(postBattleMealChanceCopy(4, 0)).toBe(
      "いま食事ログは4件です。完了すると90%、もう1件記録すると90%です。",
    );
  });
});
