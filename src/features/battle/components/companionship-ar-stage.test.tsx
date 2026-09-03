import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CompleteBattleResult } from "@/features/battle/actions";

import { CompanionshipArFrame } from "./companionship-ar-stage";

const acquired: Extract<CompleteBattleResult, { success: true }> = {
  success: true,
  battleId: "00000000-0000-4000-8000-000000000001",
  companionshipResult: true,
  acquiredCharacter: {
    id: "curry-poop",
    name: "カレーうんちくん",
    attribute: "curry",
    rarity: "common",
  },
  completedAt: "2026-09-04T03:00:00.000Z",
  usedMealLog: true,
};

const missed: Extract<CompleteBattleResult, { success: true }> = {
  ...acquired,
  companionshipResult: false,
  acquiredCharacter: null,
};

describe("CompanionshipArFrame", () => {
  it("カメラ許可時はライブ映像を重ね、撮影保存UIは出さない", () => {
    const markup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl={null}
        phase="staging"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
      />,
    );
    expect(markup).toContain("便器に向けたカメラ");
    expect(markup).toContain("playsInline");
    expect(markup).toContain("muted");
    expect(markup).not.toContain("controls");
    expect(markup).not.toContain("撮影する");
    expect(markup).not.toContain("便器から這い出てきた");
    expect(markup).toContain("この画面ではやり直しません");
  });

  it("拒否時は静止背景でも結果確認まで進める", () => {
    const markup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={missed}
        mealPhotoUrl={null}
        phase="staging"
        status="denied"
        reduceMotion
        onSkip={() => undefined}
      />,
    );
    expect(markup).not.toContain("便器に向けたカメラ");
    expect(markup).toContain("静止背景で結果を表示します");
    expect(markup).toContain("結果を見る");
  });

  it("成功時だけ這い出る。失敗時は再抽選できないと出す", () => {
    const successMarkup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl={null}
        phase="reveal"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
      />,
    );
    const missMarkup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={missed}
        mealPhotoUrl={null}
        phase="reveal"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
      />,
    );
    expect(successMarkup).toContain("便器から這い出てきた");
    expect(successMarkup).toContain("カレーうんちくん");
    expect(missMarkup).toContain("再抽選はできません");
    expect(missMarkup).not.toContain("便器から這い出てきた");
  });

  it("選んである食事写真があるときだけ投げ入れ画像を出す", () => {
    const withPhoto = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl="blob:meal-photo"
        phase="throw"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
      />,
    );
    const withoutPhoto = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl={null}
        phase="throw"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
      />,
    );
    expect(withPhoto).toContain("便器へ投げ入れる食事の写真");
    expect(withoutPhoto).not.toContain("便器へ投げ入れる食事の写真");
  });

  it("結果フェーズでは確定済みのカードを出し、抽選をやり直す文言は出さない", () => {
    const markup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl={null}
        phase="summary"
        status="idle"
        reduceMotion
        onSkip={() => undefined}
      />,
    );
    expect(markup).toContain("仲間になった！");
    expect(markup).toContain("インベントリを見る");
    expect(markup).not.toContain("もう一度抽選");
  });
});
