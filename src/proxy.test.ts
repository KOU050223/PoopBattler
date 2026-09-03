import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { config } from "./proxy";

describe("proxy matcher", () => {
  it("アプリ画面はセッション更新の対象にする", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/battle" })).toBe(true);
  });

  it("PWA manifest とアイコンはセッション更新の対象外にする", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/manifest.webmanifest" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/icon" })).toBe(false);
  });
});
