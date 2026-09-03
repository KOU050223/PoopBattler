"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { planSpecialMotion } from "@/features/battle/special-motion";
import { readBattleSpeed } from "@/features/battle/battle-speed";
import {
  createStrainListener,
  inspectMotionPermission,
  motionSkipReason,
  readBrowserMotionEnv,
  requestMotionPermission,
  type MotionPermission,
} from "@/lib/motion";
import { useBattleStore } from "@/stores/battle-store";

export function useSpecialMotion() {
  const [permission, setPermission] = useState<MotionPermission>("unsupported");
  const [reason, setReason] = useState<string | null>(null);
  const [strainProgress, setStrainProgress] = useState(0);
  const listenerRef = useRef<ReturnType<typeof createStrainListener> | null>(null);
  const playerStance = useBattleStore((state) => state.playerStance);

  useEffect(() => {
    const listener = createStrainListener({
      host: window,
      onStrain: () => {
        useBattleStore.getState().fireSpecial();
      },
      onProgress: (progress) => {
        const next = Math.round(progress.ratio * 100) / 100;
        setStrainProgress((prev) => (prev === next ? prev : next));
      },
    });
    listenerRef.current = listener;

    return () => {
      listener.stop();
      listenerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (playerStance !== "special") {
      listenerRef.current?.stop();
    }
  }, [playerStance]);

  const activateSpecial = useCallback(() => {
    const env = readBrowserMotionEnv();
    const inspected = inspectMotionPermission(env);

    const apply = (next: MotionPermission) => {
      setPermission(next);
      setReason(motionSkipReason(next, env));
      useBattleStore.getState().beginSpecial(readBattleSpeed(window.localStorage));
      const plan = planSpecialMotion({
        permission: next,
        enteredSpecial: useBattleStore.getState().playerStance === "special",
      });

      if (plan === "fire-now") {
        useBattleStore.getState().fireSpecial();
        return;
      }

      if (plan === "listen") {
        listenerRef.current?.start();
      }
    };

    if (inspected === "prompt") {
      void requestMotionPermission(env).then(apply);
      return;
    }

    apply(inspected);
  }, []);

  return { permission, reason, strainProgress, activateSpecial };
}
