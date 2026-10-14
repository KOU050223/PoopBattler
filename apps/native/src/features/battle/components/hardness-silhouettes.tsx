import { useMemo } from "react";
import Svg, { Path, Polygon } from "react-native-svg";

import { colors } from "@/theme";

const SIZE = 30;
const SPIKE_COUNT = 9;
const OUTER_RADIUS = 14;
const INNER_RADIUS = 7;

/** 硬い側の端に置く、トゲトゲした塊のシルエット。 */
export function SpikySilhouette() {
  const points = useMemo(
    () =>
      Array.from({ length: SPIKE_COUNT * 2 }, (_, i) => {
        const radius = i % 2 === 0 ? OUTER_RADIUS : INNER_RADIUS;
        const angle = (Math.PI * i) / SPIKE_COUNT - Math.PI / 2;
        return `${(15 + radius * Math.cos(angle)).toFixed(1)},${(15 + radius * Math.sin(angle)).toFixed(1)}`;
      }).join(" "),
    [],
  );
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 30 30" accessible={false}>
      <Polygon points={points} fill={colors.charcoal} strokeLinejoin="miter" />
    </Svg>
  );
}

/** ゆるい側の端に置く、ふにゃっと垂れた塊のシルエット。 */
export function SoftSilhouette() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 30 30" accessible={false}>
      <Path
        d="M3 24 C0 24 0 19 5 18 C3 13 8 10 12 11 C13 5 22 6 21 12 C27 12 28 18 25 19 C29 21 27 26 22 25 C19 28 15 26 13 27 C9 28 6 26 3 24 Z"
        fill={colors.pencilGray}
      />
    </Svg>
  );
}

// 量のシルエット。同じ巻き形を段数と大きさで差を付け、少ない↔多いが一目で分かるようにする。
const SWIRL_TIERS = [
  "M5 27 C0 27 0 20 6 20 L24 20 C30 20 30 27 25 27 Z",
  "M8 20 C4 20 4 13 9 13 L21 13 C26 13 26 20 22 20 Z",
  "M11 13 C8 13 9 7 13 6 C14 3 17 3 17 6 C21 7 22 13 19 13 Z",
];

/** 少ない側の端に置く、ちょこんとした小さな塊。 */
export function SmallAmountSilhouette() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 30 30" accessible={false}>
      <Path
        d="M9 27 C5 27 5 21 10 21 L20 21 C25 21 25 27 21 27 Z M12 21 C10 21 11 16 14 16 C16 14 18 16 18 18 C19 19 19 21 18 21 Z"
        fill={colors.pencilGray}
      />
    </Svg>
  );
}

/** 多い側の端に置く、3段に積み上がった大きな塊。 */
export function LargeAmountSilhouette() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 30 30" accessible={false}>
      {SWIRL_TIERS.map((d) => (
        <Path key={d} d={d} fill={colors.charcoal} stroke={colors.paperWhite} strokeWidth={1} />
      ))}
    </Svg>
  );
}
