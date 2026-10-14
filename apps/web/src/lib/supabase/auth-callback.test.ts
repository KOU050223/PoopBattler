import { describe, expect, it } from "vitest";

import { buildNextUrl, sanitizeNextPath } from "./auth-callback";

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

  // WHATWG の URL パーサは特別スキームでバックスラッシュをスラッシュへ正規化する。
  // `/\evil.example` は `//evil.example` と同じ意味になり、`//` だけを弾いても
  // オープンリダイレクトが通る。
  it("バックスラッシュ始まりは別オリジンへ解決されるため拒否する", () => {
    expect(sanitizeNextPath("/\\evil.example")).toBe("/");
    expect(sanitizeNextPath("\\\\evil.example")).toBe("/");
    expect(sanitizeNextPath("/\\/evil.example")).toBe("/");
  });

  it("拒否した結果が同一オリジンへ解決されることまで確かめる", () => {
    // 「/ を返す」だけでなく、実際に new URL で解決したときの origin を見る。
    // 判定を通り抜けた値がどこへ向かうかが本質のため。
    const origin = "http://localhost:3000";
    for (const hostile of ["/\\evil.example", "//evil.example", "https://evil.example"]) {
      const resolved = new URL(sanitizeNextPath(hostile), origin);
      expect(resolved.origin).toBe(origin);
    }
  });

  it("同一オリジンのクエリ・フラグメント付きパスは保持する", () => {
    expect(sanitizeNextPath("/meals?tab=today")).toBe("/meals?tab=today");
    expect(sanitizeNextPath("/meals#latest")).toBe("/meals#latest");
  });
});

describe("buildNextUrl", () => {
  const origin = "http://localhost:3000";

  it("クエリを持つ戻り先へも、連結ではなくパラメータとして足す", () => {
    // 文字列連結だと "/meals?tab=today?auth_error=..." になり、
    // 受け取り側が auth_error をパラメータとして読めない。
    const url = buildNextUrl("/meals?tab=today", origin, {
      key: "auth_error",
      value: "access_denied",
    });

    expect(url.pathname).toBe("/meals");
    expect(url.searchParams.get("tab")).toBe("today");
    expect(url.searchParams.get("auth_error")).toBe("access_denied");
  });

  it("フラグメントを持つ戻り先でもクエリとして足す", () => {
    const url = buildNextUrl("/meals#latest", origin, { key: "auth_linked", value: "1" });

    expect(url.searchParams.get("auth_linked")).toBe("1");
    expect(url.hash).toBe("#latest");
  });

  it("戻り先が別オリジンを指していても自分のオリジンへ留める", () => {
    for (const hostile of ["/\\evil.example", "//evil.example"]) {
      expect(buildNextUrl(hostile, origin, { key: "auth_error", value: "x" }).origin)
        .toBe(origin);
    }
  });
});
