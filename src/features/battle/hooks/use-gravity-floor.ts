"use client";

import { useEffect, useState } from "react";

import { screenUpAngleDeg, smoothAngleDeg } from "@/features/battle/companionship-gravity";

/** 許可ダイアログは出さない。イベントが来なければ 0°（画面上が上）。 */
export function useGravityFloorAngle() {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let current = 0;

    function handle(event: DeviceMotionEvent) {
      current = smoothAngleDeg(current, screenUpAngleDeg(event.accelerationIncludingGravity));
      setAngle((prev) => (Math.abs(prev - current) < 0.2 ? prev : current));
    }

    window.addEventListener("devicemotion", handle);
    return () => {
      window.removeEventListener("devicemotion", handle);
    };
  }, []);

  return angle;
}
