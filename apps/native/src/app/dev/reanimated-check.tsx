import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors, fonts, spacing } from "@/theme";

const BOX_SIZE = 96;

/**
 * Reanimated / Gesture Handler の導入確認用。
 * ボックスをドラッグ → 離すと中央にバネで戻る。トイレ検出との worklets 衝突確認は別途実機で行う。
 */
export default function DevReanimatedCheckScreen() {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);

  const pan = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.15);
    })
    .onChange((event) => {
      offsetX.value += event.changeX;
      offsetY.value += event.changeY;
    })
    .onFinalize(() => {
      offsetX.value = withSpring(0);
      offsetY.value = withSpring(0);
      scale.value = withSpring(1);
    });

  const boxStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureHandlerRootView style={styles.screen}>
      <Text style={styles.title}>Reanimated 確認</Text>
      <Text style={styles.hint}>ボックスをドラッグして離すと、バネで元に戻ればOK</Text>
      <View style={styles.stage}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.box, boxStyle]} />
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paperWhite, padding: spacing.xl, gap: spacing.md },
  title: { fontFamily: fonts.black, fontSize: 20, color: colors.charcoal },
  hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.charcoal },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  box: { width: BOX_SIZE, height: BOX_SIZE, borderRadius: 16, backgroundColor: colors.charcoal },
});
