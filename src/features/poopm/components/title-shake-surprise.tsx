"use client";

import { motion, useReducedMotion } from "framer-motion";
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
const SHAKE_COOLDOWN_MS = 260;
const MAX_FALLING_CHARACTERS = 5;
const CHARACTER_IDS = ["curry-poop", "vegetable-poop", "spicy-poop"] as const;

type FallingCharacter = {
  id: number;
  characterId: (typeof CHARACTER_IDS)[number];
  left: number;
  distance: number;
  tilt: number;
};

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
  const [fallingCharacters, setFallingCharacters] = useState<FallingCharacter[]>([]);
  const lastShakeAt = useRef(0);
  const nextCharacterId = useRef(0);

  const revealCharacters = useCallback(() => {
    if (reduceMotion) {
      return;
    }

    const now = Date.now();
    if (now - lastShakeAt.current < SHAKE_COOLDOWN_MS) {
      return;
    }

    lastShakeAt.current = now;
    nextCharacterId.current += 1;
    const character: FallingCharacter = {
      id: nextCharacterId.current,
      characterId: CHARACTER_IDS[nextCharacterId.current % CHARACTER_IDS.length],
      left: 4 + Math.random() * 86,
      distance: window.innerHeight + 180,
      tilt: -12 + Math.random() * 24,
    };
    setFallingCharacters((current) => [
      ...current.slice(-(MAX_FALLING_CHARACTERS - 1)),
      character,
    ]);
    navigator.vibrate?.(12);
  }, [reduceMotion]);

  const removeCharacter = useCallback((id: number) => {
    setFallingCharacters((current) => current.filter((character) => character.id !== id));
  }, []);

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

      {fallingCharacters.length > 0 ? (
        <div role="status" aria-label={copy.found} className="title-shake-characters">
          {fallingCharacters.map((character) => (
            <motion.div
              key={character.id}
              className="title-shake-character"
              style={{ left: `${character.left}%` }}
              initial={{ opacity: 0, scale: 0.72, y: -180, rotate: character.tilt }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.72, 1, 0.9],
                y: [-180, character.distance],
                rotate: [character.tilt, character.tilt * -0.35],
              }}
              transition={{ duration: 1.1, ease: "linear", times: [0, 0.08, 0.84, 1] }}
              onAnimationComplete={() => removeCharacter(character.id)}
            >
              <PoopmFigure
                appearance={POOPM_APPEARANCES[character.characterId]}
                facing="front"
                motion="idle"
                label=""
              />
            </motion.div>
          ))}
        </div>
      ) : null}
    </>
  );
}
