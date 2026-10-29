import { createElement, type ReactNode } from "react";

// 描画テスト共通のモック。ネイティブの見た目は実機で確認する。
type Children = { children?: ReactNode };
const host = (tag: string) => ({ children }: Children) => createElement(tag, null, children);

export const pressableProps: { current: Record<string, unknown> } = { current: {} };

export const nativeMock = () => ({
  View: host("div"),
  Text: host("span"),
  Image: () => createElement("img"),
  Modal: ({ visible, children }: Children & { visible: boolean }) => (visible ? createElement("div", null, children) : null),
  Pressable: (props: Record<string, unknown> & Children) => {
    pressableProps.current = props;
    return createElement("button", null, props.children);
  },
  StyleSheet: { create: (value: unknown) => value, absoluteFill: {} },
});

export const reanimatedMock = () => ({
  default: { View: host("div") },
  SlideInDown: { springify: () => ({ damping: () => ({ stiffness: () => ({}) }) }) },
  useReducedMotion: () => false,
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: () => ({}),
  withSpring: (value: number) => value,
});

export const hapticsMock = () => ({ impactAsync: () => Promise.resolve(), ImpactFeedbackStyle: { Light: "light" } });

export const ioniconsMock = () => ({ default: ({ name }: { name: string }) => createElement("i", null, name) });
