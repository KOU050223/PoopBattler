import { router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Button } from "@/components/ui";
import { colors, fonts, spacing } from "@/theme";

const SWIPE_MIN_DISTANCE_PX = 28;
const LONG_PRESS_MS = 400;
const FINGER_DOT_SIZE = 56;

type Side = "left" | "right";
type SwipeDirection = "上" | "下" | "左" | "右";

function swipeDirection(dx: number, dy: number): SwipeDirection {
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "右" : "左";
  return dy > 0 ? "下" : "上";
}

/**
 * reanimated 4 + gesture-handler の実機検証用 dev 画面。
 * 1 本の Manual ジェスチャーでタップ / 長押し / スワイプを判定し、指追従は shared value で描く。
 */
export default function GestureProbeScreen() {
  const [width, setWidth] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [holdSide, setHoldSide] = useState<Side | null>(null);
  const [swipe, setSwipe] = useState<SwipeDirection | null>(null);

  const fingerX = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const isFingerDown = useSharedValue(false);

  // 判定は JS 側に集約する。UI スレッドの worklet からは座標だけ渡す
  const startRef = useRef({ x: 0, y: 0 });
  const isLongPressRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widthRef = useRef(0);
  widthRef.current = width;

  const clearTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  const sideOf = (x: number): Side => (x < widthRef.current / 2 ? "left" : "right");

  const handleDown = (x: number, y: number) => {
    startRef.current = { x, y };
    isLongPressRef.current = false;
    setSwipe(null);
    clearTimer();
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setHoldSide(sideOf(startRef.current.x));
    }, LONG_PRESS_MS);
  };

  const handleMove = (x: number, y: number) => {
    if (isLongPressRef.current) {
      setHoldSide(sideOf(x));
      return;
    }
    // 動き出したら長押しにはならない
    const moved = Math.hypot(x - startRef.current.x, y - startRef.current.y);
    if (moved >= SWIPE_MIN_DISTANCE_PX) clearTimer();
  };

  const handleUp = (x: number, y: number) => {
    clearTimer();
    setHoldSide(null);
    if (isLongPressRef.current) return;
    const dx = x - startRef.current.x;
    const dy = y - startRef.current.y;
    if (Math.hypot(dx, dy) >= SWIPE_MIN_DISTANCE_PX) setSwipe(swipeDirection(dx, dy));
    else setTapCount((count) => count + 1);
  };

  const handleCancel = () => {
    clearTimer();
    setHoldSide(null);
  };

  const gesture = Gesture.Manual()
    .onTouchesDown((event, stateManager) => {
      const touch = event.changedTouches[0];
      fingerX.value = touch.x;
      fingerY.value = touch.y;
      isFingerDown.value = true;
      stateManager.activate();
      scheduleOnRN(handleDown, touch.x, touch.y);
    })
    .onTouchesMove((event) => {
      const touch = event.changedTouches[0];
      fingerX.value = touch.x;
      fingerY.value = touch.y;
      scheduleOnRN(handleMove, touch.x, touch.y);
    })
    .onTouchesUp((event, stateManager) => {
      const touch = event.changedTouches[0];
      isFingerDown.value = false;
      stateManager.end();
      scheduleOnRN(handleUp, touch.x, touch.y);
    })
    .onTouchesCancelled((_event, stateManager) => {
      isFingerDown.value = false;
      stateManager.fail();
      scheduleOnRN(handleCancel);
    });

  const fingerStyle = useAnimatedStyle(() => ({
    opacity: isFingerDown.value ? 1 : 0,
    transform: [
      { translateX: fingerX.value - FINGER_DOT_SIZE / 2 },
      { translateY: fingerY.value - FINGER_DOT_SIZE / 2 },
    ],
  }));

  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View style={styles.screen} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          <View style={styles.panel} pointerEvents="none">
            <Text style={styles.title}>ジェスチャー検証</Text>
            <Text style={styles.line}>タップ回数: {tapCount}</Text>
            <Text style={styles.line}>長押し中: {holdSide === null ? "-" : holdSide === "left" ? "左" : "右"}</Text>
            <Text style={styles.line}>スワイプ: {swipe ?? "-"}</Text>
          </View>
          <View style={styles.backArea}>
            <Button label="もどる" variant="secondary" onPress={() => router.back()} />
          </View>
          <Animated.View style={[styles.finger, fingerStyle]} pointerEvents="none" />
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.paperWhite, padding: spacing.xl },
  panel: { gap: spacing.sm },
  title: { fontFamily: fonts.black, fontSize: 20, color: colors.charcoal, marginBottom: spacing.sm },
  line: { fontFamily: fonts.black, fontSize: 16, color: colors.charcoal },
  backArea: { marginTop: "auto" },
  finger: {
    position: "absolute",
    top: 0,
    left: 0,
    width: FINGER_DOT_SIZE,
    height: FINGER_DOT_SIZE,
    borderRadius: FINGER_DOT_SIZE / 2,
    backgroundColor: colors.charcoal,
    opacity: 0.35,
  },
});
