import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { Poopm3DBattleMotion } from "../poopm-3d-motion";
import type { Poopm3DAppearance } from "./poopm-3d-model";
import { Poopm3DSolo } from "./poopm-3d-solo";

export type PoopmFigure3DProps = {
  appearance: Poopm3DAppearance;
  motion?: Poopm3DBattleMotion;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

// 2D PoopmSprite の3D版ドロップイン。1体ごとに GL コンテキストを持つので、
// 多数並ぶ一覧画面では使わず、結果表示など1〜2体の用途に限る。
export function PoopmFigure3D({ appearance, motion = "idle", label = "うんちくん", style }: PoopmFigure3DProps) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={style}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Poopm3DSolo appearance={appearance} motion={{ name: motion, nonce: 0 }} />
      </View>
    </View>
  );
}
