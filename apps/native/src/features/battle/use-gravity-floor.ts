import { useEffect, useRef, useState } from "react";
import { DeviceMotion } from "expo-sensors";

import {
  gravityUpVec,
  screenUpAngleDeg,
  smoothGravityVec3,
  type GravityVec3,
} from "@poopbattler/domain/battle/companionship-gravity";

import { gravityAxisFromDeviceMotion } from "./companionship-ar";

export type GravityFloor = {
  /** 画面平面に投影した「上」の角度。デバッグ表示用。 */
  angleDeg: number;
  /** カメラ空間での世界の上向き（床法線）。未取得・非対応は null。 */
  up: GravityVec3 | null;
};

const UPDATE_INTERVAL_MS = 50;

/**
 * web の use-gravity-floor の native 版。許可は要らないが、センサー非対応や
 * イベントが来ない環境（シミュレータ）では angleDeg=0 / up=null のままにする。
 */
export function useGravityFloor(): GravityFloor {
  const smoothedRef = useRef<GravityVec3 | null>(null);
  const [floor, setFloor] = useState<GravityFloor>({ angleDeg: 0, up: null });

  useEffect(() => {
    const sub = DeviceMotion.addListener((measurement) => {
      smoothedRef.current = smoothGravityVec3(
        smoothedRef.current,
        gravityAxisFromDeviceMotion(measurement.accelerationIncludingGravity),
      );
      const next: GravityFloor = {
        angleDeg: screenUpAngleDeg(smoothedRef.current),
        up: gravityUpVec(smoothedRef.current),
      };
      setFloor((prev) => {
        // センサーイベントは高頻度なので、角度の微小変化では再描画しない。
        const upMoved =
          (prev.up == null) !== (next.up == null)
          || (prev.up != null
            && next.up != null
            && Math.hypot(
              prev.up.x - next.up.x,
              prev.up.y - next.up.y,
              prev.up.z - next.up.z,
            ) > 0.005);
        if (Math.abs(prev.angleDeg - next.angleDeg) < 0.2 && !upMoved) return prev;
        return next;
      });
    });
    DeviceMotion.setUpdateInterval(UPDATE_INTERVAL_MS);
    return () => sub.remove();
  }, []);

  return floor;
}
