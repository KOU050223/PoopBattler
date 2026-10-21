import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { DoubleSide, MeshStandardMaterial, type Group, type Mesh } from "three";

import type { Species } from "../types";
import { RikishiShadow } from "./Dohyo";
import type { LoserFall, RikishiPose } from "./pose";

interface RikishiColors {
  body: string;
  mawashi: string;
}

// 試作 SPECIES の color / mw。Species 型には色を持たせない方針なので描画側で引く
const RIKISHI_COLORS: Record<string, RikishiColors> = {
  curry: { body: "#c98a33", mawashi: "#4b2d7a" },
  banana: { body: "#d8bb52", mawashi: "#2f5d8a" },
  ganko: { body: "#6e4a2f", mawashi: "#8a2f2f" },
};
const FALLBACK_COLORS = RIKISHI_COLORS.curry;

const ARM_SIDES = [-1, 1] as const;
const EYE_Z = [-0.16, 0.16] as const;

export interface RikishiHandle {
  /** 毎フレーム useFrame から呼ぶ。three のオブジェクトを直接書き換え、React state は使わない */
  apply(pose: RikishiPose): void;
  /** apply の後に呼び、敗者の便器への落下で位置・傾き・大きさを上書きする */
  applyFall(fall: LoserFall): void;
}

export interface RikishiProps {
  species: Species;
}

export const Rikishi = forwardRef<RikishiHandle, RikishiProps>(function Rikishi({ species }, ref) {
  const colors = RIKISHI_COLORS[species.id] ?? FALLBACK_COLORS;
  const rootRef = useRef<Group>(null);
  const leanRef = useRef<Group>(null);
  const armPivotRefs = useRef<(Group | null)[]>([null, null]);
  const armMeshRefs = useRef<(Mesh | null)[]>([null, null]);

  // 発光は胴の全パーツで共有する material の emissive だけを動かす（パーツごとに触らない）
  const bodyMaterial = useMemo(() => new MeshStandardMaterial({ color: colors.body, roughness: 0.55, emissive: 0x000000 }), [colors.body]);
  useEffect(() => () => bodyMaterial.dispose(), [bodyMaterial]);

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
        pose.arms.forEach((arm, index) => {
          const pivot = armPivotRefs.current[index];
          const mesh = armMeshRefs.current[index];
          if (!pivot || !mesh) return;
          pivot.rotation.y = arm.pivotRotationY;
          pivot.rotation.z = arm.pivotRotationZ;
          mesh.position.x = arm.meshX;
        });
        bodyMaterial.emissive.setHex(pose.glowColor);
        bodyMaterial.emissiveIntensity = pose.glowIntensity;
      },
      applyFall(fall) {
        const root = rootRef.current;
        const lean = leanRef.current;
        if (!root || !lean) return;
        root.position.set(fall.position.x, fall.position.y, fall.position.z);
        root.scale.setScalar(fall.scale);
        lean.rotation.z = fall.leanRotationZ;
      },
    }),
    [bodyMaterial],
  );

  return (
    <group ref={rootRef}>
      <RikishiShadow />
      <group ref={leanRef}>
        <mesh material={bodyMaterial} position={[0, 0.36, 0]} scale={[1, 0.58, 1]}>
          <sphereGeometry args={[0.64, 28, 18]} />
        </mesh>
        <mesh material={bodyMaterial} position={[0, 0.84, 0]} scale={[1, 0.62, 1]}>
          <sphereGeometry args={[0.47, 26, 16]} />
        </mesh>
        <mesh material={bodyMaterial} position={[0, 1.2, 0]} scale={[1, 0.7, 1]}>
          <sphereGeometry args={[0.31, 22, 14]} />
        </mesh>
        <mesh material={bodyMaterial} position={[-0.04, 1.47, 0]} rotation-z={0.55}>
          <coneGeometry args={[0.15, 0.38, 14]} />
        </mesh>
        {/* まわしは筒の開口を見せるので両面描画 */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.6, 0.66, 0.2, 28, 1, true]} />
          <meshStandardMaterial color={colors.mawashi} roughness={0.8} side={DoubleSide} />
        </mesh>
        <mesh position={[-0.62, 0.32, 0]}>
          <boxGeometry args={[0.12, 0.24, 0.3]} />
          <meshStandardMaterial color={colors.mawashi} roughness={0.8} />
        </mesh>
        {EYE_Z.map((z) => (
          <group key={z}>
            <mesh position={[0.38, 0.94, z]}>
              <sphereGeometry args={[0.1, 14, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <mesh position={[0.47, 0.95, z]}>
              <sphereGeometry args={[0.05, 10, 8]} />
              <meshStandardMaterial color="#1a120c" roughness={0.8} />
            </mesh>
          </group>
        ))}
        {ARM_SIDES.map((side, index) => (
          <group
            key={side}
            ref={(node) => {
              armPivotRefs.current[index] = node;
            }}
            position={[0.05, 0.74, side * 0.5]}
          >
            <mesh
              ref={(node) => {
                armMeshRefs.current[index] = node;
              }}
              material={bodyMaterial}
              position={[0.26, 0, 0]}
              rotation-z={-Math.PI / 2}
            >
              <capsuleGeometry args={[0.11, 0.36, 4, 10]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
});
