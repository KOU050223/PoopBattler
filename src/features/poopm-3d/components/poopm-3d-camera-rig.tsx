"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { Poopm3DMotionRequest } from "@/features/poopm-3d/components/poopm-3d-model";
import {
  diffCameraSides,
  resolveCameraCue,
  softenStageCameraCue,
  STAGE_CAMERA_WIDE,
  type StageCameraCue,
} from "@/features/poopm-3d/poopm-3d.camera";

export type Poopm3DCameraRigProps = {
  player: Poopm3DMotionRequest;
  enemy: Poopm3DMotionRequest;
  // prefers-reduced-motion。寄り・ズーム・揺れを弱める。
  reduceMotion?: boolean;
};

// キューへの寄りは速く、ワイドへの復帰はゆったり（ポケモンの「寄って戻る」感）。
const DAMP_TO_CUE = 7.0;
const DAMP_TO_WIDE = 2.2;
const DRIFT_AMPLITUDE = 0.07;
const SHAKE_DECAY_SEC = 0.6;

// モーションの差分をカメラキューに変換し、useFrame で滑らかに補間するリグ。
// カメラは毎フレームここが決めるので OrbitControls 等とは併用しない。
export function Poopm3DCameraRig({
  player,
  enemy,
  reduceMotion = false,
}: Poopm3DCameraRigProps) {
  const active = useRef<{ cue: StageCameraCue; since: number } | null>(null);
  const lastMotions = useRef<{ player: Poopm3DMotionRequest; enemy: Poopm3DMotionRequest } | null>(null);
  const clockNow = useRef(0);
  const position = useRef(
    new THREE.Vector3(...(STAGE_CAMERA_WIDE.position as [number, number, number])),
  );
  const lookAt = useRef(
    new THREE.Vector3(...(STAGE_CAMERA_WIDE.lookAt as [number, number, number])),
  );

  useEffect(() => {
    const motions = { player, enemy };
    const changed = diffCameraSides(lastMotions.current, motions);
    lastMotions.current = motions;
    if (changed.length === 0) return;
    const { cue, release } = resolveCameraCue(
      changed,
      motions,
      active.current?.cue ?? null,
    );
    if (cue) {
      active.current = { cue, since: clockNow.current };
    } else if (release) {
      active.current = null;
    }
  }, [player, enemy]);

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const t = state.clock.elapsedTime;
    clockNow.current = t;

    let cue = active.current;
    if (
      cue &&
      cue.cue.hold.kind === "timed" &&
      t - cue.since > cue.cue.hold.seconds
    ) {
      active.current = null;
      cue = null;
    }

    const shot = cue
      ? reduceMotion
        ? softenStageCameraCue(cue.cue)
        : cue.cue
      : STAGE_CAMERA_WIDE;
    const damping = cue ? DAMP_TO_CUE : DAMP_TO_WIDE;

    position.current.x = THREE.MathUtils.damp(position.current.x, shot.position[0], damping, delta);
    position.current.y = THREE.MathUtils.damp(position.current.y, shot.position[1], damping, delta);
    position.current.z = THREE.MathUtils.damp(position.current.z, shot.position[2], damping, delta);
    lookAt.current.x = THREE.MathUtils.damp(lookAt.current.x, shot.lookAt[0], damping, delta);
    lookAt.current.y = THREE.MathUtils.damp(lookAt.current.y, shot.lookAt[1], damping, delta);
    lookAt.current.z = THREE.MathUtils.damp(lookAt.current.z, shot.lookAt[2], damping, delta);
    camera.fov = THREE.MathUtils.damp(camera.fov, shot.fov, damping, delta);
    camera.updateProjectionMatrix();

    camera.position.copy(position.current);

    // ワイド待機中だけ、ごく緩いドリフトで生きた画面にする。
    if (!cue && !reduceMotion) {
      camera.position.x += Math.sin(t * 0.32) * DRIFT_AMPLITUDE;
      camera.position.y += Math.sin(t * 0.24 + 1.7) * DRIFT_AMPLITUDE * 0.6;
    }

    if (cue && cue.cue.shake > 0 && !reduceMotion) {
      const decay = Math.max(0, 1 - (t - cue.since) / SHAKE_DECAY_SEC);
      const amp = cue.cue.shake * decay;
      camera.position.x += Math.sin(t * 47.3) * amp;
      camera.position.y += Math.sin(t * 39.7 + 2.1) * amp;
      camera.position.z += Math.sin(t * 44.9 + 4.3) * amp * 0.6;
    }

    camera.lookAt(lookAt.current);
  });

  return null;
}
