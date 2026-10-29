import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// react-native は Flow 構文で vitest から読めないため、描画せずに要素の木だけを検査できるスタブに差し替える。
vi.mock("react-native", () => ({
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
  StyleSheet: { create: <T,>(styles: T) => styles },
}));

// fonts.ts が読み込む expo-font は __DEV__ を要求して vitest で落ちる。使うのはフォント名だけ。
vi.mock("../fonts", () => ({ fontFamily: { jaMedium: "ja", jaBold: "ja", numBold: "num" } }));

import { ListRow } from "./ListRow";

function collect(node: ReactNode, found: ReactElement<{ children?: ReactNode; onPress?: () => void }>[] = []) {
  if (Array.isArray(node)) node.forEach((child) => collect(child, found));
  else if (isValidElement<{ children?: ReactNode; onPress?: () => void }>(node)) {
    found.push(node);
    collect(node.props.children, found);
  }
  return found;
}

function texts(node: ReactNode): string[] {
  return collect(node)
    .map((element) => element.props.children)
    .filter((child): child is string => typeof child === "string");
}

describe("ListRow", () => {
  it("行を押すと onPress が呼ばれる", () => {
    const onPress = vi.fn();
    const row = ListRow({ label: "レポート", onPress });
    row.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("badge を渡すとラベルと一緒に表示される", () => {
    const row = ListRow({ label: "レポート", onPress: () => {}, badge: "新着" });
    expect(texts(row)).toEqual(expect.arrayContaining(["レポート", "新着"]));
  });

  it("badge を渡さないときはバッジが出ない", () => {
    const row = ListRow({ label: "レポート", onPress: () => {} });
    expect(texts(row)).not.toContain("新着");
  });
});
