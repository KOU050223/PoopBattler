import { StyleSheet, View } from "react-native";
import Svg, { Ellipse } from "react-native-svg";

import { homePalette } from "../home-palette";
import { haloLayout } from "../home-layout";

// 下の泡3つの後ろに敷く静止の台座。押せるものと誤解されないよう、タップもスクリーンリーダーも素通りさせる。
export function HomeHalo({ windowWidth, largeBubbleSize }: { windowWidth: number; largeBubbleSize: number }) {
  const { width, height, left, top, cx, cy, rx, ry, rotation } = haloLayout(windowWidth, largeBubbleSize);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.halo, { width, height, left, top }]}
    >
      <Svg width={width} height={height}>
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={homePalette.haloFill} transform={`rotate(${rotation} ${cx} ${cy})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: "absolute" },
});
