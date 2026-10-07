import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";

import { SPECIAL_GAUGE_MAX } from "@poopbattler/domain/battle/battle.constants";
import type { BattleSnapshot } from "@poopbattler/domain/battle/battle.types";

const KEEP_AWAKE_TAG = "battle";

/** バトル中だけ画面スリープを抑止する。 */
export function useBattleKeepAwake(active: boolean) {
  useEffect(() => {
    if (!active) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [active]);
}

const fire = (run: () => Promise<void>) => void run().catch(() => {});

/** ヒット・必殺・決着の触覚。スナップショットの差分だけで決める。 */
export function useBattleHaptics(snapshot: BattleSnapshot) {
  const previous = useRef<BattleSnapshot | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = snapshot;
    if (!before || before.battleId !== snapshot.battleId) return;

    if (snapshot.status !== before.status) {
      if (snapshot.status === "completing") fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      else if (snapshot.status === "defeated") fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      return;
    }

    const enemyHit = (snapshot.enemy?.hp ?? 0) < (before.enemy?.hp ?? 0);
    const specialFired = before.playerGauge >= SPECIAL_GAUGE_MAX && snapshot.playerGauge === 0 && enemyHit;
    if (specialFired) {
      fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    } else if (enemyHit) {
      fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    } else if (snapshot.party && before.party) {
      const hp = snapshot.party[snapshot.activeIndex]?.hp ?? 0;
      const prevHp = before.party[before.activeIndex]?.hp ?? 0;
      if (snapshot.activeIndex === before.activeIndex && hp < prevHp) {
        fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
      }
    }
  }, [snapshot]);
}
