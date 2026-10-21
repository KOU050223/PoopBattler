import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber/native";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

import type { BodyColorId, EyeId, HeadId, MouthId } from "../../battle/poopm-appearance";
import { POOPM_3D_BODY_COLORS, poopm3DBaseGlb, poopm3DEyeTexture, poopm3DHeadVarGlb, poopm3DMouthTexture } from "../poopm-3d-assets";
import { loadFaceTexture } from "../poopm-3d-face-texture";
import { cloneGlbScene, loadGlb } from "../poopm-3d-glb-loader";
import { poopm3DMotionSpec, type Poopm3DBattleMotion, type Poopm3DMotionRequest } from "../poopm-3d-motion";

export type { Poopm3DMotionRequest };

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

function findMaterial(root: THREE.Object3D, name: string): THREE.MeshStandardMaterial | null {
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

function cloneMaterials(mesh: THREE.Mesh) {
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
}

// loadGlb は Promise なので Suspense の代わりに state で受ける。キャッシュ済みなら即解決する。
function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let alive = true;
    setValue(undefined);
    load()
      .then((v) => alive && setValue(v))
      .catch((e) => console.warn("[poopm-3d] 読み込みに失敗:", e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export function Poopm3DModel(props: Poopm3DModelProps) {
  const base = useAsync(() => loadGlb(poopm3DBaseGlb()), []);
  const head = useAsync(() => loadGlb(poopm3DHeadVarGlb(props.appearance.head)), [props.appearance.head]);
  if (!base || !head) return null;
  return <LoadedModel {...props} base={base} headGltf={head} />;
}

function LoadedModel({
  appearance,
  motion,
  facing = "front",
  timeScale = 1,
  position = [0, 0, 0],
  scale = 1,
  onMotionFinished,
  base,
  headGltf,
}: Poopm3DModelProps & { base: GLTF; headGltf: GLTF }) {
  const { animations } = base;
  const eyeTexture = useAsync(() => loadFaceTexture(poopm3DEyeTexture(appearance.eyes) as number), [appearance.eyes]);
  const mouthTexture = useAsync(() => loadFaceTexture(poopm3DMouthTexture(appearance.mouth) as number), [appearance.mouth]);

  // 2体を同時に出すため scene を毎回クローンする。マテリアルも
  // clone しないと体色・フェイステクスチャの上書きが個体間で共有されてしまう。
  const cloned = useMemo(() => {
    const copy = cloneGlbScene(base);
    copy.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.visible = VISIBLE_MESH_NODES.has(mesh.name);
      // スキン変形でボーンの外に出る瞬間があるため、バウンディングで消えないようにする。
      mesh.frustumCulled = false;
      cloneMaterials(mesh);
    });
    return copy;
  }, [base]);

  // 頭バリアントも個体ごとにクローンする（体色の上書きが個体間で共有されないよう
  // ベース同様マテリアルも複製する）。
  const clonedHead = useMemo(() => {
    const copy = SkeletonUtils.clone(headGltf.scene);
    copy.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      cloneMaterials(mesh);
    });
    return copy;
  }, [headGltf]);

  // 頭を b_root 配下に置くための変換は、クローン直後（mixer 未駆動＝
  // バインドポーズ）のローカル行列から一度だけ逆算する。再生中に再計算すると
  // その瞬間のポーズが焼き付いて頭がずれる。
  const headMount = useMemo(() => {
    const bRoot = cloned.getObjectByName("b_root");
    if (!bRoot) return null;
    cloned.updateMatrixWorld(true);
    return new THREE.Matrix4().copy(bRoot.matrixWorld).invert();
  }, [cloned]);

  // 稼働リグには頭用ソケットが無い。頭ドームの頂点は全て b_root にバインドされて
  // いるため、b_root の子にすればアニメーションの頭と同じ変形を受けて追随する。
  useEffect(() => {
    if (!headMount) return;
    const bRoot = cloned.getObjectByName("b_root");
    if (!bRoot) return;
    const holder = new THREE.Group();
    headMount.decompose(holder.position, holder.quaternion, holder.scale);
    holder.add(clonedHead);
    bRoot.add(holder);
    return () => {
      bRoot.remove(holder);
    };
  }, [cloned, clonedHead, headMount]);

  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);

  // 頭バリアントのドームも poopm_body マテリアルなので同じ色を書き込む。
  useEffect(() => {
    const color = POOPM_3D_BODY_COLORS[appearance.color];
    findMaterial(cloned, "poopm_body")?.color.set(color);
    findMaterial(clonedHead, "poopm_body")?.color.set(color);
  }, [cloned, clonedHead, appearance.color]);

  // テクスチャはキャッシュ共有なので dispose しない（web と違い個体ごとに作らない）。
  useEffect(() => {
    const apply = (materialName: string, texture: THREE.Texture | undefined) => {
      const material = findMaterial(cloned, materialName);
      if (!material || !texture) return;
      material.map = texture;
      material.needsUpdate = true;
    };
    apply("poopm_eye", eyeTexture);
    apply("poopm_mouth", mouthTexture);
  }, [cloned, eyeTexture, mouthTexture]);

  const currentAction = useRef<THREE.AnimationAction | null>(null);
  useEffect(() => {
    const spec = poopm3DMotionSpec(motion.name);
    const clip = THREE.AnimationClip.findByName(animations, spec.clip);
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
    if (previous && previous !== action) action.crossFadeFrom(previous, fadeSec, false);
    else action.fadeIn(fadeSec);
    action.play();
    currentAction.current = action;
  }, [mixer, animations, motion.name, motion.nonce]);

  // once クリップの終了を上位へ通知する。終了後の扱いは呼び出し側の状態機械に任せる。
  useEffect(() => {
    const onFinished = (event: { action: THREE.AnimationAction }) => {
      // クロスフェード済み＝次のクリップへ移行済みなら通知しない。
      if (event.action !== currentAction.current) return;
      onMotionFinished?.(event.action.getClip().name as Poopm3DBattleMotion);
    };
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [mixer, onMotionFinished]);

  useFrame((_, delta) => {
    mixer.update(delta * timeScale);
  });

  return (
    <group position={position} scale={scale} rotation-y={facing === "back" ? Math.PI : 0}>
      <primitive object={cloned} />
    </group>
  );
}
