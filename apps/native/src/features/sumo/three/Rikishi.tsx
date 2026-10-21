import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Group, Material, Mesh, MeshStandardMaterial, Object3D } from "three";

import { Poopm3DModel } from "@/features/poopm-3d/components/poopm-3d-model";
import type { Poopm3DBattleMotion, Poopm3DMotionRequest } from "@/features/poopm-3d/poopm-3d.motion";

import type { Species } from "../types";
import { appearanceOfSpecies } from "./appearance";
import { RikishiShadow } from "./Dohyo";
import type { LoserFall, RikishiPose } from "./pose";

/** GLB の足先〜頭頂（約 2.9）を、土俵上の力士の背丈（約 1.5）に合わせる倍率 */
const MODEL_SCALE = 0.55;
/** モデル原点は頭側にあり、足先は原点の 2.25 下。足を土俵面に揃えるための持ち上げ量 */
const MODEL_FEET_OFFSET = 2.25 * MODEL_SCALE;
/** GLB は +z が正面。力士は +x 方向へ攻める座標系なので、起点で 90° 回す */
const FACING_ATTACK_DIRECTION = Math.PI / 2;

export interface RikishiHandle {
  /** 毎フレーム useFrame から呼ぶ。three のオブジェクトを直接書き換え、React state は使わない */
  apply(pose: RikishiPose): void;
  /** apply の後に呼び、敗者の便器への落下で位置・傾き・大きさを上書きする */
  applyFall(fall: LoserFall): void;
  /** 毎フレーム呼んでよい。名前が変わったときだけクリップを切り替える（state 更新はそのときのみ） */
  setMotion(name: Poopm3DBattleMotion): void;
}

export interface RikishiProps {
  species: Species;
}

const isStandardMaterial = (material: Material): material is MeshStandardMaterial => "emissive" in material;

function collectMaterials(root: Object3D): MeshStandardMaterial[] {
  const materials: MeshStandardMaterial[] = [];
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (isStandardMaterial(material)) materials.push(material);
    }
  });
  return materials;
}

export const Rikishi = forwardRef<RikishiHandle, RikishiProps>(function Rikishi({ species }, ref) {
  const appearance = useMemo(() => appearanceOfSpecies(species.id), [species.id]);
  const rootRef = useRef<Group>(null);
  const leanRef = useRef<Group>(null);
  // 発光は GLB のマテリアルの emissive だけを動かす。シーンが差し替わるたびに集め直す
  const glowMaterialsRef = useRef<MeshStandardMaterial[]>([]);
  const motionNameRef = useRef<Poopm3DBattleMotion>("idle");
  const [motion, setMotionRequest] = useState<Poopm3DMotionRequest>({ name: "idle", nonce: 0 });

  const onSceneReady = useCallback((scene: Object3D | null) => {
    glowMaterialsRef.current = scene ? collectMaterials(scene) : [];
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      apply(pose) {
        const root = rootRef.current;
        const lean = leanRef.current;
        if (!root || !lean) return;
        root.position.set(pose.position.x, pose.position.y, pose.position.z);
        root.rotation.y = pose.rotationY;
        root.scale.setScalar(1);
        lean.rotation.z = pose.leanRotationZ;
        lean.scale.set(pose.leanScale.x, pose.leanScale.y, pose.leanScale.z);
        for (const material of glowMaterialsRef.current) {
          material.emissive.setHex(pose.glowColor);
          material.emissiveIntensity = pose.glowIntensity;
        }
      },
      applyFall(fall) {
        const root = rootRef.current;
        const lean = leanRef.current;
        if (!root || !lean) return;
        root.position.set(fall.position.x, fall.position.y, fall.position.z);
        root.scale.setScalar(fall.scale);
        lean.rotation.z = fall.leanRotationZ;
      },
      setMotion(name) {
        if (motionNameRef.current === name) return;
        motionNameRef.current = name;
        setMotionRequest((previous) => ({ name, nonce: previous.nonce + 1 }));
      },
    }),
    [],
  );

  return (
    <group ref={rootRef}>
      <RikishiShadow />
      <group ref={leanRef}>
        <group rotation-y={FACING_ATTACK_DIRECTION}>
          <Poopm3DModel
            appearance={appearance}
            motion={motion}
            position={[0, MODEL_FEET_OFFSET, 0]}
            scale={MODEL_SCALE}
            onSceneReady={onSceneReady}
          />
        </group>
      </group>
    </group>
  );
});
