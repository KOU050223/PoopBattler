import { Canvas, useFrame } from "@react-three/fiber/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { loadGlb } from "@/features/poopm-3d/poopm-3d-glb-loader";

import { TOILET_GLB_MODULE } from "../toilet-glb-module";
import {
  FLUSH_DURATION_MS,
  REDUCED_FLUSH_DURATION_MS,
  flushProgress,
  shakeOffset,
  swirlAngle,
  waterLevel,
} from "../toilet-flush-motion";

type ToiletFlushProps = {
  isFlushing: boolean;
  /** 「視差効果を減らす」がオンなら揺れと回転を止め、待ち時間だけ残す。 */
  reduceMotion: boolean;
  onFlushed: () => void;
  size: number;
};

// GLB は高さ約 0.67・前が +Z・原点は背面の床。画面に収まる大きさへ拡大し、奥行きの中心を原点へ寄せる。
const MODEL_SCALE = 3.3;
const MODEL_CENTER_Z = 0.31;
const WATER = "#9fdcf7";
const SWIRL_DOT_COUNT = 6;
// 便座の開口の中心と水面の高さ（モデル座標）。
const BOWL_CENTER = { x: 0, y: 0.335, z: 0.41 };
const WATER_RADIUS = 0.14;
const SWIRL_RADIUS = 0.085;
const SWIRL_DOT_SIZE = 0.022;
// フタは蝶番（後ろ）を軸に、前を持ち上げて立てる。
const LID_OPEN_RAD = -1.75;
const HANDLE_PRESS_RAD = 0.5;

function useToiletGltf(): GLTF | undefined {
  const [gltf, setGltf] = useState<GLTF>();
  useEffect(() => {
    let isAlive = true;
    loadGlb(TOILET_GLB_MODULE)
      .then((loaded) => isAlive && setGltf(loaded))
      .catch((error: unknown) => console.warn("[gacha] 便器の読み込みに失敗:", error));
    return () => {
      isAlive = false;
    };
  }, []);
  return gltf;
}

function Toilet({ isFlushing, reduceMotion, onFlushed }: Omit<ToiletFlushProps, "size">) {
  const gltf = useToiletGltf();
  const root = useRef<THREE.Group>(null);
  const water = useRef<THREE.Mesh>(null);
  const swirl = useRef<THREE.Group>(null);
  const startedAt = useRef<number | null>(null);
  const hasNotified = useRef(false);

  const scene = useMemo(() => {
    if (!gltf) return null;
    const copy = gltf.scene.clone(true);
    copy.getObjectByName("ToiletSeatCover")?.rotation.set(LID_OPEN_RAD, 0, 0);
    return copy;
  }, [gltf]);

  useEffect(() => {
    startedAt.current = null;
    hasNotified.current = false;
  }, [isFlushing]);

  useFrame((state) => {
    const group = root.current;
    if (!group) return;
    const now = state.clock.elapsedTime * 1000;
    let progress = 0;
    if (isFlushing) {
      startedAt.current ??= now;
      progress = flushProgress(now - startedAt.current, reduceMotion ? REDUCED_FLUSH_DURATION_MS : FLUSH_DURATION_MS);
      if (progress >= 1 && !hasNotified.current) {
        hasNotified.current = true;
        onFlushed();
      }
    }
    // 待機中はゆっくり左右に首を振るだけ。流している間は揺れに任せる。
    group.rotation.y = reduceMotion || isFlushing ? 0 : Math.sin(now / 900) * 0.25;
    group.position.x = reduceMotion || !isFlushing ? 0 : shakeOffset(progress);
    scene?.getObjectByName("ToiletFlushHandle")?.rotation.set(0, 0, isFlushing ? HANDLE_PRESS_RAD : 0);
    if (water.current) water.current.scale.y = Math.max(0.001, waterLevel(progress));
    if (swirl.current) {
      swirl.current.rotation.y = reduceMotion ? 0 : swirlAngle(progress);
      swirl.current.visible = isFlushing;
      swirl.current.scale.setScalar(Math.max(0.001, 1 - progress * 0.9));
    }
  });

  if (!scene) return null;
  return (
    <group ref={root}>
      <group scale={MODEL_SCALE} position={[0, 0, -MODEL_CENTER_Z * MODEL_SCALE]}>
        <primitive object={scene} />
        <mesh ref={water} position={[BOWL_CENTER.x, BOWL_CENTER.y, BOWL_CENTER.z]}>
          <cylinderGeometry args={[WATER_RADIUS, WATER_RADIUS, 0.02, 32]} />
          <meshStandardMaterial color={WATER} roughness={0.15} />
        </mesh>
        <group ref={swirl} position={[BOWL_CENTER.x, BOWL_CENTER.y + 0.02, BOWL_CENTER.z]}>
          {Array.from({ length: SWIRL_DOT_COUNT }, (_, i) => {
            const angle = (i / SWIRL_DOT_COUNT) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(angle) * SWIRL_RADIUS, 0, Math.sin(angle) * SWIRL_RADIUS]}>
                <sphereGeometry args={[SWIRL_DOT_SIZE, 12, 12]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}

export function ToiletFlush({ size, ...toiletProps }: ToiletFlushProps) {
  return (
    <View pointerEvents="none" style={{ width: size, height: size }} accessibilityRole="image">
      <Canvas
        camera={{ position: [0, 2.2, 5], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
        style={styles.canvas}
        onCreated={({ camera }) => camera.lookAt(0, 1.0, 0)}
      >
        <ambientLight intensity={1.7} />
        <hemisphereLight args={["#e8f2ff", "#8a7f76", 0.5]} />
        <directionalLight position={[2, 4, 6]} intensity={1.4} />
        <Toilet {...toiletProps} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "transparent" },
});
