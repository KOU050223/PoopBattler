import { StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/theme";
import { BigText } from "./BigText";
import { Cinescope } from "./Cinescope";
import { Commentary } from "./Commentary";
import { CutIn } from "./CutIn";
import { FocusLines } from "./FocusLines";
import { MiniGamePanel, type MiniGamePanelView } from "./MiniGamePanel";
import { motionPlan, type OverlayState, type RivalLabelPlacement } from "./overlay-state";
import { RankBadge } from "./RankBadge";
import { RivalLabel } from "./RivalLabel";

/** 実況の帯の下に順位を置く。帯は最大2行 */
const RANK_BADGE_OFFSET = 64;

export interface RaceOverlayProps {
  overlay: OverlayState;
  isMotionReduced: boolean;
  rank: number;
  total: number;
  panel: MiniGamePanelView | null;
  /** カメラがライバルを撮っているときだけ渡す */
  rival: { name: string; placement: SharedValue<RivalLabelPlacement> } | null;
}

/** レース画面に重ねる演出の全部。タッチは受けない（入力はレース画面全体で受ける） */
export function RaceOverlay({ overlay, isMotionReduced, rank, total, panel, rival }: RaceOverlayProps) {
  const insets = useSafeAreaInsets();
  const motion = motionPlan(isMotionReduced);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <FocusLines isOn={overlay.isFocusLines} motion={motion} />
      <Cinescope isOn={overlay.isCinema} slideMs={motion.cinemaSlideMs} />
      {rival ? <RivalLabel name={rival.name} placement={rival.placement} /> : null}
      <BigText bigText={overlay.bigText} isPop={motion.isBigTextPop} />
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Commentary say={overlay.say} isMotionReduced={isMotionReduced} />
      </View>
      <View style={[styles.rank, { top: insets.top + RANK_BADGE_OFFSET }]}>
        <RankBadge rank={rank} total={total} isBump={motion.isBigTextPop} />
      </View>
      <MiniGamePanel panel={panel} motion={motion} />
      <CutIn cutIn={overlay.cutIn} slideMs={motion.cutInSlideMs} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 0, right: 0, top: 0, paddingHorizontal: spacing.lg },
  rank: { position: "absolute", left: spacing.lg },
});
