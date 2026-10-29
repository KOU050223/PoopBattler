import { StyleSheet, View } from "react-native";
import Svg, { Ellipse } from "react-native-svg";

import { homePalette } from "../home-palette";
import { haloLayout } from "../home-layout";

const EDGE_WIDTH = 1.5;

// 下の泡3つの後ろに敷く静止の飾り。押せるものと誤解されないよう、タップもスクリーンリーダーも素通りさせる。
export function HomeHalo({ windowWidth, largeBubbleSize }: { windowWidth: number; largeBubbleSize: number }) {
  const { width, height, left, top } = haloLayout(windowWidth, largeBubbleSize);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.halo, { width, height, left, top }]}
    >
      <Svg width={width} height={height}>
        <Ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2 - EDGE_WIDTH}
          ry={height / 2 - EDGE_WIDTH}
          fill={homePalette.haloFill}
          stroke={homePalette.haloEdge}
          strokeWidth={EDGE_WIDTH}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: "absolute" },
});
