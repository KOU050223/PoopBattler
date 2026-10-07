import { useEffect, useState, useSyncExternalStore } from "react";

import { battleSpeedCache } from "./battle-speed-cache";
import { useBattleStore } from "./battle-store";

/** バトル状態（AsyncStorage）と倍速キャッシュの両方が読み込み済みになったら true。 */
export function useBattleHydrated(): boolean {
  const storeHydrated = useSyncExternalStore(
    (onChange) => useBattleStore.persist.onFinishHydration(onChange),
    () => useBattleStore.persist.hasHydrated(),
    () => false,
  );
  const [speedLoaded, setSpeedLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void battleSpeedCache.load().then(() => alive && setSpeedLoaded(true));
    return () => {
      alive = false;
    };
  }, []);
  return storeHydrated && speedLoaded;
}
