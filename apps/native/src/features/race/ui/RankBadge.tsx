import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { colors, fonts, radius, spacing } from "@/theme";

const RANK_FONT_SIZE = 28;
const UNIT_FONT_SIZE = 14;
const BUMP_SCALE = 1.25;
const BUMP_SPRING = { damping: 8, stiffness: 300 } as const;

interface Props {
  rank: number;
  total: number;
  /** 順位が変わったとき弾ませるか（reduce motion では false） */
  isBump: boolean;
}

/** 自分の順位。置く場所は呼び出し側 */
export function RankBadge({ rank, total, isBump }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isBump) scale.value = withSequence(withTiming(BUMP_SCALE, { duration: 70 }), withSpring(1, BUMP_SPRING));
  }, [rank, isBump, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.badge, style]} accessibilityLabel={`${total}人中${rank}位`}>
      <Text style={styles.rank}>{rank}</Text>
      <Text style={styles.unit}>位</Text>
      <View style={styles.divider} />
      <Text style={styles.total}>/ {total}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "baseline", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  rank: { fontFamily: fonts.black, fontSize: RANK_FONT_SIZE, color: colors.flushEdge },
  unit: { fontFamily: fonts.bold, fontSize: UNIT_FONT_SIZE, color: colors.flushEdge, marginLeft: 2 },
  divider: { width: spacing.sm },
  total: { fontFamily: fonts.bold, fontSize: UNIT_FONT_SIZE, color: colors.pencilGray },
});
