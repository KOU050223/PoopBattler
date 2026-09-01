import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnonymousSignIn } from "./anonymous-sign-in";

describe("AnonymousSignIn", () => {
  it("状態メッセージだけをライブリージョンにする", () => {
    const markup = renderToStaticMarkup(<AnonymousSignIn />);

    expect(markup).toContain('<p aria-live="polite">プレイを準備しています…</p>');
    expect(markup).not.toMatch(/<section[^>]*aria-live/);
  });
});
