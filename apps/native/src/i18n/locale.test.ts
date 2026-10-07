import { describe, expect, it } from "vitest";

import { defaultLocale, resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it.each([
    ["ja", "ja"],
    ["en", "en"],
    ["en-US", "en"],
    ["JA_JP", "ja"],
  ])("%s -> %s", (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });

  it.each([undefined, null, "", "fr", "zh-Hans"])("許可リスト外 %s は既定ロケールへ", (input) => {
    expect(resolveLocale(input)).toBe(defaultLocale);
  });
});
