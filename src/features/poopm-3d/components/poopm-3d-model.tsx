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
  poopm3DHeadVarGlb,
  poopm3DMouthTexture,
} from "@/features/poopm-3d/poopm-3d.assets";
import {
  poopm3DMotionSpec,
  type Poopm3DBattleMotion,
} from "@/features/poopm-3d/poopm-3d.motion";
import {
  HEAD_IDS,
  type BodyColorId,
  type EyeId,
  type HeadId,
  type MouthId,
} from "@/features/poopm/poopm.types";

// 表示するメッシュのノード名をホワイトリストで限定する。再エクスポートで
// 編集残骸が混じっても黙って映り込まないよう、ブラックリストにはしない。
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
  head: HeadId;
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
  const { scene: headScene } = useGLTF(poopm3DHeadVarGlb(appearance.head));
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

  // 頭バリアントも個体ごとにクローンする（体色の上書きが個体間で共有されないよう
  // ベース同様マテリアルも複製する）。非スキンメッシュなので clone で十分だが、
  // ベースと手順を揃えるため SkeletonUtils.clone を使う。
  const clonedHead = useMemo(() => {
    const copy = SkeletonUtils.clone(headScene);
    copy.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
    });
    return copy;
  }, [headScene]);

  // 頭バリアントを稼働リグの b_root の子としてモデル原点に置く。
  // 稼働リグ（poopm_rig）には頭用ソケットが無い。頭ドームの頂点は全て
  // b_root にバインドされているため、b_root の子にすればアニメーションの
  // 頭と同じ変形を受けて追随する。
  useEffect(() => {
    const bRoot = cloned.getObjectByName("b_root");
    if (!bRoot) return;
    const holder = new THREE.Group();
    cloned.updateWorldMatrix(true, true);
    const mount = new THREE.Matrix4()
      .copy(bRoot.matrixWorld)
      .invert()
      .multiply(cloned.matrixWorld);
    mount.decompose(holder.position, holder.quaternion, holder.scale);
    holder.add(clonedHead);
    bRoot.add(holder);
    return () => {
      bRoot.remove(holder);
    };
  }, [cloned, clonedHead]);

  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);

  // 体色・フェイステクスチャの差し替え。クローン済みマテリアルにだけ効く。
  // 頭バリアントのドームも poopm_body マテリアルなので同じ色を書き込む。
  useEffect(() => {
    const color = POOPM_3D_BODY_COLORS[appearance.color];
    findMaterial(cloned, "poopm_body")?.color.set(color);
    findMaterial(clonedHead, "poopm_body")?.color.set(color);
  }, [cloned, clonedHead, appearance.color]);

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
for (const head of HEAD_IDS) {
  useGLTF.preload(poopm3DHeadVarGlb(head));
}
