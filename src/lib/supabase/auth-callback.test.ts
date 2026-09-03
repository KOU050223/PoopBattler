import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "./auth-callback";

describe("sanitizeNextPath", () => {
  it("同一オリジンの絶対パスはそのまま使う", () => {
    expect(sanitizeNextPath("/meals")).toBe("/meals");
  });

  it("next が無い場合は入口へ戻す", () => {
    expect(sanitizeNextPath(null)).toBe("/");
  });

  it("プロトコル相対URLは別オリジンを指すため拒否する", () => {
    expect(sanitizeNextPath("//evil.example/steal")).toBe("/");
  });

  it("絶対URLは拒否する", () => {
    expect(sanitizeNextPath("https://evil.example/steal")).toBe("/");
  });

  it("相対パスは拒否する", () => {
    expect(sanitizeNextPath("meals")).toBe("/");
  });
});
