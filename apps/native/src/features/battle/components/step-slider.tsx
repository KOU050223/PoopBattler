import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "@/theme";
import { ratioFromPosition, stepIndexFromPosition, stepRatio } from "../step-slider";

const THUMB_SIZE = 34;
const TRACK_HEIGHT = 10;
const DOT_SIZE = 6;
const TOUCH_HEIGHT = 52;
const SNAP_SPRING = { useNativeDriver: true, speed: 22, bounciness: 6 } as const;

type StepOption<T> = { value: T; label: string };

/**
 * アナログなゲージ。ドラッグ中はつまみが指に連続で追従し、離すと最寄りの段階へ吸い付く。
 * 値は指が段階をまたいだ時点で更新するので、上の表示は動かしながら読める。
 * 親が ScrollView でも縦スクロールに奪われないよう、ドラッグ中は応答権を手放さない。
 */
export function StepSlider<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  startLabel,
  endLabel,
  placeholder,
  startAdornment,
  endAdornment,
}: {
  options: readonly StepOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  startLabel: string;
  endLabel: string;
  placeholder: string;
  /** ゲージ両端に置く飾り（硬さのシルエットなど）。 */
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const index = options.findIndex((option) => option.value === value);
  const hasValue = index >= 0;
  const position = useRef(new Animated.Value(hasValue ? stepRatio(index, options.length) : 0)).current;
  const isDragging = useRef(false);
  // locationX は指の下にある要素基準で、移動中に値が飛ぶことがある。
  // 触り始めの位置を一度だけ取り、以降は指の移動量(dx)を足して追従する。
  const dragOriginX = useRef(0);
  const lastIndex = useRef(index);
  // PanResponder は生成時の値を閉じ込めるため、最新値は ref 経由で読む。
  const latest = useRef({ options, onChange, trackWidth, index });
  latest.current = { options, onChange, trackWidth, index };

  const track = (x: number) => {
    const { options: current, onChange: emit, trackWidth: width } = latest.current;
    position.setValue(ratioFromPosition(x, width));
    const next = stepIndexFromPosition(x, width, current.length);
    if (next !== lastIndex.current) {
      lastIndex.current = next;
      void Haptics.selectionAsync().catch(() => undefined);
      emit(current[next].value);
    }
  };

  const release = () => {
    isDragging.current = false;
    const { options: current, index: selected } = latest.current;
    if (selected >= 0) Animated.spring(position, { toValue: stepRatio(selected, current.length), ...SNAP_SPRING }).start();
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          isDragging.current = true;
          dragOriginX.current = event.nativeEvent.locationX;
          track(dragOriginX.current);
        },
        onPanResponderMove: (_event, gesture) => track(dragOriginX.current + gesture.dx),
        onPanResponderRelease: release,
        onPanResponderTerminate: release,
      }),
    [],
  );

  // アクセシビリティ操作など、ドラッグ以外で値が変わったときもつまみを追従させる。
  useEffect(() => {
    lastIndex.current = index;
    if (!isDragging.current && index >= 0) {
      Animated.spring(position, { toValue: stepRatio(index, options.length), ...SNAP_SPRING }).start();
    }
  }, [index, options.length, position]);

  const step = (delta: number) => {
    const next = Math.min(options.length - 1, Math.max(0, (hasValue ? index : 0) + delta));
    onChange(options[next].value);
  };

  const usable = Math.max(0, trackWidth - THUMB_SIZE);
  // 再レンダリングのたびに interpolate を作り直すと Animated の購読が張り直され、
  // 段階をまたぐ瞬間（= 値が変わって再描画される瞬間）につまみが1フレーム引っかかる。
  // left/width はレイアウトを毎フレーム再計算するため JS スレッド駆動になり、ドラッグ中の
  // FPS が落ちる。translateX だけで動かして native driver に載せる（塗りは全幅の板を
  // 横にずらして、親の overflow hidden で切る）。
  const { thumbX, fillX } = useMemo(
    () => ({
      thumbX: position.interpolate({ inputRange: [0, 1], outputRange: [0, usable] }),
      fillX: position.interpolate({
        inputRange: [0, 1],
        outputRange: [THUMB_SIZE / 2 - trackWidth, -THUMB_SIZE / 2],
      }),
    }),
    [position, usable, trackWidth],
  );

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={hasValue ? { min: 1, max: options.length, now: index + 1, text: options[index].label } : undefined}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === "increment" ? 1 : -1)}
      style={styles.root}
    >
      {/* locationX が子要素基準にならないよう、タッチ受けは1枚のレイヤーにまとめ、中身は pointerEvents none */}
      <View style={styles.gaugeRow}>
      {startAdornment}
      <View style={styles.touchArea} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)} {...responder.panHandlers}>
        <View style={styles.track} pointerEvents="none" />
        {hasValue ? (
          <View style={styles.fillClip} pointerEvents="none">
            <Animated.View style={[styles.fill, { transform: [{ translateX: fillX }] }]} />
          </View>
        ) : null}
        <View style={[styles.dots, { left: THUMB_SIZE / 2 - DOT_SIZE / 2, right: THUMB_SIZE / 2 - DOT_SIZE / 2 }]} pointerEvents="none">
          {options.map((option, i) => (
            <View key={String(option.value)} style={[styles.dot, hasValue && i <= index && styles.dotOn]} />
          ))}
        </View>
        {hasValue ? (
          <Animated.View pointerEvents="none" style={[styles.thumb, { transform: [{ translateX: thumbX }] }]} />
        ) : (
          <Text style={styles.placeholder} pointerEvents="none">{placeholder}</Text>
        )}
      </View>
      {endAdornment}
      </View>
      <View style={styles.ends} pointerEvents="none">
        <Text style={styles.end}>{startLabel}</Text>
        <Text style={styles.end}>{endLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 2 },
  gaugeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  touchArea: { flex: 1, height: TOUCH_HEIGHT, justifyContent: "center" },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.blushWash,
  },
  fillClip: {
    position: "absolute",
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  fill: { width: "100%", height: TRACK_HEIGHT, backgroundColor: colors.flushPink },
  dots: { position: "absolute", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: colors.fadedGray },
  dotOn: { backgroundColor: colors.paperWhite },
  thumb: {
    position: "absolute",
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.paperWhite,
    borderWidth: 3,
    borderColor: colors.flushEdge,
    elevation: 2,
  },
  // 背後の目盛りの点と文字が重ならないよう、白地で隠す。
  placeholder: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: colors.paperWhite,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.pencilGray,
  },
  ends: { flexDirection: "row", justifyContent: "space-between" },
  end: { fontFamily: fonts.bold, fontSize: 12, color: colors.pencilGray },
});
