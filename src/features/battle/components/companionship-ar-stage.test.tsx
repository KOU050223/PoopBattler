import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/ja.json";

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
    expect(withPhoto).toContain('data-throw-x="50.0"');
    expect(withPhoto).toContain('data-throw-y="72.0"');
    expect(withoutPhoto).not.toContain("便器へ投げ入れる食事の写真");
  });

  it("便器 hit では bbox と score を出し、写真は座面寄りの投げ入れ先へ向かう", () => {
    const markup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl="blob:meal-photo"
        phase="throw"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
        detectionStatus="ready"
        toiletSight={{
          kind: "hit",
          box: { x: 10, y: 20, width: 80, height: 100, score: 0.74 },
          target: { x: 41.2, y: 68.5 },
        }}
        throwTarget={{ x: 41.2, y: 68.5 }}
      />,
    );
    expect(markup).toContain('data-toilet-box="hit"');
    expect(markup).toContain('data-toilet-score="0.74"');
    expect(markup).toContain("便器を検出 74%");
    expect(markup).not.toContain("スワイプして投げ入れてください");
    expect(markup).not.toContain("もう一度抽選");
    expect(markup).toContain('data-throw-x="41.2"');
    expect(markup).toContain('data-throw-y="68.5"');
  });

  it("未検出でも投げ入れでき、低scoreは採用枠と別表示になる", () => {
    const noneMarkup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl="blob:meal-photo"
        phase="throw"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
        detectionStatus="ready"
        toiletSight={{ kind: "none" }}
        throwTarget={{ x: 12, y: 18 }}
        aimPoint={{ x: 12, y: 18 }}
      />,
    );
    const lowMarkup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl="blob:meal-photo"
        phase="staging"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
        detectionStatus="ready"
        toiletSight={{
          kind: "low",
          box: { x: 8, y: 8, width: 40, height: 40, score: 0.31 },
          target: { x: 20, y: 30 },
        }}
      />,
    );
    expect(noneMarkup).toContain("便器へ投げ入れる食事の写真");
    expect(noneMarkup).toContain("便器が見つかりません");
    expect(noneMarkup).toContain('data-throw-x="12.0"');
    expect(noneMarkup).toContain('data-aim-point="true"');
    expect(noneMarkup).not.toContain("data-toilet-box");
    expect(lowMarkup).toContain('data-toilet-box="low"');
    expect(lowMarkup).toContain("便器かも… 31%");
    expect(lowMarkup).toContain("タップで投げ入れ先");
    expect(lowMarkup).not.toContain("便器を検出");
    expect(lowMarkup).toContain('data-gacha-swipe="blocked"');
  });

  it("便器 hit の staging はスワイプ開始できる。未検出はタップ前だと開始できない", () => {
    const hitMarkup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl="blob:meal-photo"
        phase="staging"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
        detectionStatus="ready"
        toiletSight={{
          kind: "hit",
          box: { x: 10, y: 20, width: 80, height: 100, score: 0.74 },
          target: { x: 41.2, y: 68.5 },
        }}
      />,
    );
    const noneMarkup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl="blob:meal-photo"
        phase="staging"
        status="ready"
        reduceMotion
        onSkip={() => undefined}
        detectionStatus="ready"
        toiletSight={{ kind: "none" }}
      />,
    );
    const aimedMarkup = renderToStaticMarkup(
      <CompanionshipArFrame
        result={acquired}
        mealPhotoUrl="blob:meal-photo"
        phase="staging"
        status="denied"
        reduceMotion
        onSkip={() => undefined}
        detectionStatus="failed"
        toiletSight={{ kind: "none" }}
        aimPoint={{ x: 12, y: 18 }}
      />,
    );
    expect(hitMarkup).toContain('data-gacha-swipe="ready"');
    expect(hitMarkup).toContain("スワイプして食事を投げ入れてください");
    expect(hitMarkup).toContain("スワイプで開始");
    expect(noneMarkup).toContain('data-gacha-swipe="blocked"');
    expect(noneMarkup).toContain("便器にカメラを向けてください");
    expect(noneMarkup).not.toContain("スワイプして食事を投げ入れてください");
    expect(aimedMarkup).toContain('data-gacha-swipe="ready"');
    expect(aimedMarkup).toContain("スワイプして食事を投げ入れてください");
  });

  it("結果フェーズでは確定済みのカードを出し、抽選をやり直す文言は出さない", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="ja" messages={messages}>
        <CompanionshipArFrame
          result={acquired}
          mealPhotoUrl={null}
          phase="summary"
          status="idle"
          reduceMotion
          onSkip={() => undefined}
        />
      </NextIntlClientProvider>,
    );
    expect(markup).toContain("仲間になった！");
    expect(markup).toContain("インベントリを見る");
    expect(markup).not.toContain("もう一度抽選");
  });
});
