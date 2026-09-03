import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BattleMealPhotoStep } from "./battle-meal-photo-step";

describe("BattleMealPhotoStep", () => {
  it("必須に見せず、スキップでき、カメラ起動の文言を出さない", () => {
    const markup = renderToStaticMarkup(
      <BattleMealPhotoStep
        previewUrl={null}
        submitting={false}
        onOpenPicker={() => undefined}
        onSkip={() => undefined}
        onSend={() => undefined}
      />,
    );

    expect(markup).toContain("任意です");
    expect(markup).toContain("写真なしで完了する");
    expect(markup).not.toContain("カメラ");
    expect(markup).not.toContain("getUserMedia");
    expect(markup).not.toContain("*");
  });

  it("写真があるときは送信でき、送信中は操作できない", () => {
    const ready = renderToStaticMarkup(
      <BattleMealPhotoStep
        previewUrl="blob:preview"
        submitting={false}
        onOpenPicker={() => undefined}
        onSkip={() => undefined}
        onSend={() => undefined}
      />,
    );
    expect(ready).toContain("この写真で送る");

    const busy = renderToStaticMarkup(
      <BattleMealPhotoStep
        previewUrl="blob:preview"
        submitting
        onOpenPicker={() => undefined}
        onSkip={() => undefined}
        onSend={() => undefined}
      />,
    );
    expect(busy).toContain("送信しています…");
    expect(busy).toContain("disabled");
  });
});
