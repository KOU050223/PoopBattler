import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** OS の「視差効果を減らす」設定。点滅・拡大・揺れの演出を止める判断に使う */
export function useReducedMotion(): boolean {
  const [isReduced, setIsReduced] = useState(false);
  useEffect(() => {
    let isActive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (isActive) setIsReduced(value);
      })
      .catch((error: unknown) => console.warn("視差効果の設定を読めませんでした:", error));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setIsReduced);
    return () => {
      isActive = false;
      subscription.remove();
    };
  }, []);
  return isReduced;
}
