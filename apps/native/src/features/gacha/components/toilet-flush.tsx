import { Canvas, useFrame } from "@react-three/fiber/native";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";

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

const PORCELAIN = "#ffffff";
const WATER = "#9fdcf7";
const SWIRL_DOT_COUNT = 6;
const SWIRL_RADIUS = 0.55;
// 便器の外形（半径, 高さ）。回転体にして、丸い鉢とくびれを1つの形で作る。
const BOWL_PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.32, 0.02],
  [0.55, 0.12],
  [0.8, 0.35],
  [0.9, 0.62],
  [0.86, 0.8],
];

// 画面の絵を使わず three で組む。GLB が用意できたらこの中身だけ差し替えればよい（props は変えない）。
function Toilet({ isFlushing, reduceMotion, onFlushed }: Omit<ToiletFlushProps, "size">) {
  const root = useRef<THREE.Group>(null);
  const water = useRef<THREE.Mesh>(null);
  const swirl = useRef<THREE.Group>(null);
  const startedAt = useRef<number | null>(null);
  const hasNotified = useRef(false);
  const bowlGeometry = useMemo(() => new THREE.LatheGeometry(BOWL_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), 32), []);

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
    group.rotation.y = reduceMotion ? 0 : isFlushing ? 0 : Math.sin(now / 900) * 0.25;
    group.position.x = reduceMotion || !isFlushing ? 0 : shakeOffset(progress);
    if (water.current) water.current.scale.y = Math.max(0.001, waterLevel(progress));
    if (swirl.current) {
      swirl.current.rotation.y = reduceMotion ? 0 : swirlAngle(progress);
      swirl.current.visible = isFlushing;
      swirl.current.scale.setScalar(Math.max(0.001, 1 - progress * 0.9));
    }
  });

  return (
    <group ref={root}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.5, 0.62, 0.4, 32]} />
        <meshStandardMaterial color={PORCELAIN} roughness={0.35} />
      </mesh>
      <mesh geometry={bowlGeometry} position={[0, 0.4, 0]}>
        <meshStandardMaterial color={PORCELAIN} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.88, 0.08, 16, 48]} />
        <meshStandardMaterial color={PORCELAIN} roughness={0.3} />
      </mesh>
      <mesh ref={water} position={[0, 1.08, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 0.1, 32]} />
        <meshStandardMaterial color={WATER} roughness={0.15} />
      </mesh>
      <group ref={swirl} position={[0, 1.15, 0]}>
        {Array.from({ length: SWIRL_DOT_COUNT }, (_, i) => {
          const angle = (i / SWIRL_DOT_COUNT) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * SWIRL_RADIUS, 0, Math.sin(angle) * SWIRL_RADIUS]}>
              <sphereGeometry args={[0.09, 12, 12]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          );
        })}
      </group>
      <mesh position={[0, 1.75, -0.8]}>
        <boxGeometry args={[1.5, 1.0, 0.5]} />
        <meshStandardMaterial color={PORCELAIN} roughness={0.35} />
      </mesh>
      <mesh position={[0.5, 2.3, -0.8]}>
        <boxGeometry args={[0.4, 0.1, 0.2]} />
        <meshStandardMaterial color="#f5b81c" />
      </mesh>
    </group>
  );
}

export function ToiletFlush({ size, ...toiletProps }: ToiletFlushProps) {
  return (
    <View pointerEvents="none" style={{ width: size, height: size }} accessibilityRole="image">
      <Canvas camera={{ position: [0, 2.4, 6], fov: 32 }} gl={{ antialias: true, alpha: true }} style={styles.canvas} onCreated={({ camera }) => camera.lookAt(0, 1.3, 0)}>
        <ambientLight intensity={1.1} />
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
