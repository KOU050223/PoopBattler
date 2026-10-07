"use client";

import { useEffect, useRef, useState } from "react";

import {
  gravityUpVec,
  screenUpAngleDeg,
  smoothGravityVec3,
  type GravityVec3,
} from "@/features/battle/companionship-gravity";

export type GravityFloor = {
  /** 画面平面に投影した「上」の角度。デバッグ表示用。 */
  angleDeg: number;
  /** カメラ空間での世界の上向き（床法線）。未取得・非対応は null。 */
  up: GravityVec3 | null;
};

/** 許可ダイアログは出さない。イベントが来なければ angleDeg=0 / up=null。 */
export function useGravityFloor(): GravityFloor {
  const smoothedRef = useRef<GravityVec3 | null>(null);
  const [floor, setFloor] = useState<GravityFloor>({ angleDeg: 0, up: null });

  useEffect(() => {
    function handle(event: DeviceMotionEvent) {
      smoothedRef.current = smoothGravityVec3(
        smoothedRef.current,
        event.accelerationIncludingGravity,
      );
      const next: GravityFloor = {
        angleDeg: screenUpAngleDeg(smoothedRef.current),
        up: gravityUpVec(smoothedRef.current),
      };
      setFloor((prev) => {
        // devicemotion は高頻度なので、角度の微小変化では再描画しない。
        const upMoved =
          (prev.up == null) !== (next.up == null) ||
          (prev.up != null &&
            next.up != null &&
            Math.hypot(
              prev.up.x - next.up.x,
              prev.up.y - next.up.y,
              prev.up.z - next.up.z,
            ) > 0.005);
        if (Math.abs(prev.angleDeg - next.angleDeg) < 0.2 && !upMoved) return prev;
        return next;
      });
    }

    window.addEventListener("devicemotion", handle);
    return () => {
      window.removeEventListener("devicemotion", handle);
    };
  }, []);

  return floor;
}
