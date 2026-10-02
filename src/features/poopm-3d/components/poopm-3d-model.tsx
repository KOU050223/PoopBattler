"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

import {
  POOPM_3D_BODY_COLORS,
  POOPM_3D_GLB,
  poopm3DEyeTexture,
  poopm3DMouthTexture,
} from "@/features/poopm-3d/poopm-3d.assets";
import {
  poopm3DMotionSpec,
  type Poopm3DBattleMotion,
} from "@/features/poopm-3d/poopm-3d.motion";
import type {
  BodyColorId,
  EyeId,
  MouthId,
} from "@/features/poopm/poopm.types";

// GLB に残る編集残骸（arm_L_old / *_bak / ICO球.001 / poopm_rig.001 など）を
// 描かないよう、表示するメッシュのノード名をホワイトリストで限定する。
// ブラックリストにすると将来の残骸が黙って映り込むため。
const VISIBLE_MESH_NODES = new Set([
  "body",
  "eye",
  "mouth",
  "arm_L",
  "arm_R",
  "leg_L",
  "leg_R",
  "foot_L",
  "foot_R",
  "hand_L",
  "hand_R",
]);

export type Poopm3DAppearance = {
  color: BodyColorId;
  eyes: EyeId;
  mouth: MouthId;
};

export type Poopm3DMotionRequest = {
  name: Poopm3DBattleMotion;
  // 同名モーションの再トリガー用。変わるたびにクリップを頭から再生する。
  nonce: number;
};

export type Poopm3DModelProps = {
  appearance: Poopm3DAppearance;
  motion: Poopm3DMotionRequest;
  facing?: "front" | "back";
  // バトル倍速。AnimationMixer.timeScale にそのまま掛ける。
  timeScale?: number;
  position?: [number, number, number];
  scale?: number;
  onMotionFinished?: (name: Poopm3DBattleMotion) => void;
};

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function findMaterial(
  root: THREE.Object3D,
  name: string,
): THREE.MeshStandardMaterial | null {
  let found: THREE.MeshStandardMaterial | null = null;
  root.traverse((object: THREE.Object3D) => {
    if (found) return;
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const hit = materialsOf(mesh).find((material) => material.name === name);
    if (hit) found = hit as THREE.MeshStandardMaterial;
  });
  return found;
}

function clipOf(animations: THREE.AnimationClip[], name: string) {
  return THREE.AnimationClip.findByName(animations, name);
}

// glTF の UV は flipY=false 前提。読み込みと同時に揃える（alphaTest は
// 素材側の設定を維持する）。TextureLoader.load は非同期でも Texture を即返す。
function loadFaceTexture(path: string): THREE.Texture {
  const texture = new THREE.TextureLoader().load(path);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Poopm3DModel({
  appearance,
  motion,
  facing = "front",
  timeScale = 1,
  position = [0, 0, 0],
  scale = 1,
  onMotionFinished,
}: Poopm3DModelProps) {
  const { scene, animations } = useGLTF(POOPM_3D_GLB);
  const eyeTexture = useMemo(
    () => loadFaceTexture(poopm3DEyeTexture(appearance.eyes)),
    [appearance.eyes],
  );
  const mouthTexture = useMemo(
    () => loadFaceTexture(poopm3DMouthTexture(appearance.mouth)),
    [appearance.mouth],
  );

  // 2体を同時に出すため scene を毎回クローンする。マテリアルも
  // clone しないと体色・フェイステクスチャの上書きが個体間で共有されてしまう。
  const cloned = useMemo(() => {
    const copy = SkeletonUtils.clone(scene);
    copy.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.visible = VISIBLE_MESH_NODES.has(mesh.name);
      // スキン変形でボーンの外に出る瞬間があるため、バウンディングで消えないようにする。
      mesh.frustumCulled = false;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
    });
    return copy;
  }, [scene]);

  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);

  // 体色・フェイステクスチャの差し替え。クローン済みマテリアルにだけ効く。
  useEffect(() => {
    const bodyMaterial = findMaterial(cloned, "poopm_body");
    bodyMaterial?.color.set(POOPM_3D_BODY_COLORS[appearance.color]);
  }, [cloned, appearance.color]);

  useEffect(() => {
    const apply = (materialName: string, texture: THREE.Texture) => {
      const material = findMaterial(cloned, materialName);
      if (!material) return;
      material.map = texture;
      material.needsUpdate = true;
    };
    apply("poopm_eye", eyeTexture);
    apply("poopm_mouth", mouthTexture);
  }, [cloned, eyeTexture, mouthTexture]);

  // 差し替えで前のテクスチャがGPUに残らないよう破棄する。
  useEffect(() => () => eyeTexture.dispose(), [eyeTexture]);
  useEffect(() => () => mouthTexture.dispose(), [mouthTexture]);

  // モーション再生。prop が変わるたびに該当クリップへクロスフェードする。
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  useEffect(() => {
    const spec = poopm3DMotionSpec(motion.name);
    const clip = clipOf(animations, spec.clip);
    if (!clip) return;

    const action = mixer.clipAction(clip);
    const fadeSec = spec.fadeMs / 1000;
    const previous = currentAction.current;

    action.reset();
    if (spec.loop === "once") {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
    if (previous && previous !== action) {
      action.crossFadeFrom(previous, fadeSec, false);
    } else {
      action.fadeIn(fadeSec);
    }
    action.play();
    currentAction.current = action;
  }, [mixer, animations, motion.name, motion.nonce]);

  // once クリップの終了を上位へ通知する。終了後に idle へ戻すか最終フレームを
  // 保持するかの判断は呼び出し側（モーション状態機械）に任せる。
  useEffect(() => {
    const onFinished = (event: { action: THREE.AnimationAction }) => {
      // クロスフェード済み＝次のクリップへ移行済みなら通知しない。
      if (event.action !== currentAction.current) return;
      onMotionFinished?.(
        event.action.getClip().name as Poopm3DBattleMotion,
      );
    };
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [mixer, onMotionFinished]);

  useFrame((_, delta) => {
    // バトル倍速。AnimationMixer.timeScale と同じ効果を update に掛けて出す。
    mixer.update(delta * timeScale);
  });

  return (
    <group
      position={position}
      scale={scale}
      // モデルの正面は +Z。味方は背中をカメラへ向ける。
      rotation-y={facing === "back" ? Math.PI : 0}
    >
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(POOPM_3D_GLB);
