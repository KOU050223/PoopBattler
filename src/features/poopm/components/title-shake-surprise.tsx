"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { POOPM_APPEARANCES } from "@/features/poopm/poopm.appearances";
import { PoopmFigure } from "@/features/poopm/components/poopm-figure";
import {
  accelerationMagnitude,
  inspectMotionPermission,
  pickAcceleration,
  readBrowserMotionEnv,
  requestMotionPermission,
  type DeviceMotionEventLike,
  type MotionPermission,
} from "@/lib/motion";

const SHAKE_ACCELERATION_THRESHOLD = 18;
const SHAKE_COOLDOWN_MS = 1_100;
const CHARACTER_IDS = ["curry-poop", "vegetable-poop", "spicy-poop"] as const;

type Copy = {
  enable: string;
  hint: string;
  found: string;
  preview: string;
};

function canShake(event: DeviceMotionEventLike) {
  const magnitude = accelerationMagnitude(pickAcceleration(event));
  return magnitude != null && magnitude >= SHAKE_ACCELERATION_THRESHOLD;
}

export function TitleShakeSurprise({ copy }: { copy: Copy }) {
  const reduceMotion = useReducedMotion();
  const isDevelopment = process.env.NODE_ENV === "development";
  const [permission, setPermission] = useState<MotionPermission>("unsupported");
  const [surpriseId, setSurpriseId] = useState(0);
  const lastShakeAt = useRef(0);

  const revealCharacters = useCallback(() => {
    if (reduceMotion) {
      return;
    }

    const now = Date.now();
    if (now - lastShakeAt.current < SHAKE_COOLDOWN_MS) {
      return;
    }

    lastShakeAt.current = now;
    setSurpriseId((current) => current + 1);
    navigator.vibrate?.(35);
  }, [reduceMotion]);

  const listen = useCallback(() => {
    const onDeviceMotion = (event: DeviceMotionEvent) => {
      if (canShake(event)) {
        revealCharacters();
      }
    };

    window.addEventListener("devicemotion", onDeviceMotion);
    return () => window.removeEventListener("devicemotion", onDeviceMotion);
  }, [revealCharacters]);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const env = readBrowserMotionEnv();
    const inspected = inspectMotionPermission(env);
    const timer = window.setTimeout(() => setPermission(inspected), 0);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (!reduceMotion && permission === "granted") {
      return listen();
    }
  }, [listen, permission, reduceMotion]);

  async function enableShake() {
    const env = readBrowserMotionEnv();
    const next = await requestMotionPermission(env);
    setPermission(next);
  }

  if (reduceMotion || (!isDevelopment && (permission === "unsupported" || permission === "denied"))) {
    return null;
  }

  return (
    <>
      <div aria-live="polite" className="title-shake-control">
        {isDevelopment ? (
          <button type="button" onClick={revealCharacters} className="title-shake-enable">
            {copy.preview}
          </button>
        ) : null}
        {permission === "prompt" ? (
          <button type="button" onClick={enableShake} className="title-shake-enable">
            {copy.enable}
          </button>
        ) : permission === "granted" ? (
          <p>{copy.hint}</p>
        ) : null}
      </div>

      <AnimatePresence>
        {surpriseId > 0 ? (
          <motion.div
            key={surpriseId}
            role="status"
            aria-label={copy.found}
            className="title-shake-characters"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
            }}
          >
            {CHARACTER_IDS.map((characterId, index) => (
              <motion.div
                key={characterId}
                className={`title-shake-character title-shake-character-${index + 1}`}
                initial={{ opacity: 0, scale: 0.72, y: -260, rotate: index === 1 ? 0 : index === 0 ? -12 : 12 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.72, 1.08, 0.94, 0.88],
                  y: [-260, 12, -16, 0],
                  rotate: index === 1 ? [0, 5, -3, 0] : index === 0 ? [-12, 7, -4, -8] : [12, -7, 4, 8],
                }}
                transition={{ duration: 1.5, delay: index * 0.1, ease: "easeOut", times: [0, 0.62, 0.78, 1] }}
              >
                <PoopmFigure
                  appearance={POOPM_APPEARANCES[characterId]}
                  facing="front"
                  motion="eat"
                  label=""
                />
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
