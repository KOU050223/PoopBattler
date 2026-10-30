import { Canvas, useFrame } from "@react-three/fiber/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { loadGlb } from "@/features/poopm-3d/poopm-3d-glb-loader";

import { TOILET_GLB_MODULE } from "../toilet-glb-module";
import { IDLE_CAMERA, cameraPosition, frameAt, swirlAngle, waterLevel, type Phase } from "../gacha-timeline";

type ToiletFlushProps = {
  isFlushing: boolean;
  /** 「視差効果を減らす」がオンなら揺れと回転を止め、待ち時間だけ残す。 */
  reduceMotion: boolean;
  /** 回転が止まってカメラが寄る瞬間（「デン！」）。フラッシュや振動を重ねる。 */
  onSlam: () => void;
  onFlushed: () => void;
  size: number;
};

// Kenney "Toilet Square"（CC0）。高さ約 0.45、前は -Z（タンクが +Z 側）、頂点は原点基準ではなく (x -0.3〜0, z 0〜0.39)。
// 画面に収まる大きさへ拡大し、向きを手前へ回して、モデルの中心を原点へ寄せる。
const MODEL_SCALE = 4.9;
const MODEL_CENTER = { x: -0.15, z: 0.195 };
const WATER = "#9fdcf7";
const SWIRL_DOT_COUNT = 6;
// 便座の開口の中心と水面の高さ（モデル座標）。
const BOWL_CENTER = { x: -0.152, y: 0.205, z: 0.145 };
const WATER_RADIUS = 0.075;
const SWIRL_RADIUS = 0.045;
const SWIRL_DOT_SIZE = 0.012;
const WATER_THICKNESS = 0.015;
// フタは蝶番（背面側のふち）を軸に、前を持ち上げて立てる。
const LID_NODE = "Group";
const LID_HINGE = { x: -0.152, y: 0.24, z: 0.266 };
const LID_OPEN_RAD = 1.7;
const HANDLE_NODE = "toiletSquare_1";
const HANDLE_CENTER = { x: -0.044, y: 0.386, z: 0.302 };
const HANDLE_PRESS_RAD = 0.5;
// 注視点は便器の中ほど。縮むときは便器と一緒に下がる。
const TARGET_Y = 1.0;
// 石は便器の真上に浮かび、押すと開口へ落ちる。
const STONE_HOVER_Y = 0.45;
const STONE_SIZE = 0.02;
const STONE_BOB = 0.01;
const GOLD = "#f5b81c";
function withPivot(node: THREE.Object3D, at: { x: number; y: number; z: number }, name: string): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(at.x, at.y, at.z);
  node.parent?.add(pivot);
  pivot.add(node);
  node.position.set(-at.x, -at.y, -at.z);
  return pivot;
}

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

function Toilet({ isFlushing, reduceMotion, onSlam, onFlushed }: Omit<ToiletFlushProps, "size">) {
  const gltf = useToiletGltf();
  const root = useRef<THREE.Group>(null);
  const water = useRef<THREE.Mesh>(null);
  const swirl = useRef<THREE.Group>(null);
  const stone = useRef<THREE.Mesh>(null);
  const startedAt = useRef<number | null>(null);
  const lastPhase = useRef<Phase>("idle");

  const scene = useMemo(() => {
    if (!gltf) return null;
    const copy = gltf.scene.clone(true);
    // 頂点が原点基準で入っているため、軸の位置に置いた空のグループへ入れ替えて回す。
    const lid = copy.getObjectByName(LID_NODE);
    const handle = copy.getObjectByName(HANDLE_NODE);
    if (lid) {
      const pivot = withPivot(lid, LID_HINGE, "LidPivot");
      pivot.rotation.x = LID_OPEN_RAD;
    }
    if (handle) withPivot(handle, HANDLE_CENTER, "HandlePivot");
    return copy;
  }, [gltf]);

  useEffect(() => {
    startedAt.current = null;
    lastPhase.current = "idle";
  }, [isFlushing]);

  useFrame((state) => {
    const group = root.current;
    if (!group) return;
    const now = state.clock.elapsedTime * 1000;
    if (isFlushing) startedAt.current ??= now;
    const elapsed = isFlushing && startedAt.current !== null ? now - startedAt.current : null;
    const frame = frameAt(elapsed, reduceMotion);

    if (frame.phase !== lastPhase.current) {
      lastPhase.current = frame.phase;
      if (frame.phase === "slam") onSlam();
      if (frame.phase === "done") onFlushed();
    }

    // 待機中だけ、ゆっくり首を振って「押して」と誘う。
    const sway = reduceMotion || frame.phase !== "idle" ? 0 : Math.sin(now / 900) * 0.25;
    group.rotation.y = frame.toiletYaw + sway;
    group.scale.setScalar(frame.toiletScale);

    const targetY = TARGET_Y * frame.toiletScale;
    const [x, y, z] = cameraPosition(frame.camera, targetY);
    state.camera.position.set(x, y, z);
    state.camera.lookAt(0, targetY, 0);

    scene?.getObjectByName("HandlePivot")?.rotation.set(0, 0, frame.isHandlePressed ? HANDLE_PRESS_RAD : 0);
    if (water.current) water.current.scale.y = Math.max(0.001, waterLevel(frame.spinProgress));
    if (swirl.current) {
      swirl.current.rotation.y = reduceMotion ? 0 : swirlAngle(frame.spinProgress);
      swirl.current.visible = frame.phase === "spin";
      swirl.current.scale.setScalar(Math.max(0.001, 1 - frame.spinProgress * 0.9));
    }
    if (stone.current) {
      const progress = frame.stoneProgress;
      stone.current.visible = progress !== null;
      if (progress !== null) {
        const bob = frame.phase === "idle" ? Math.sin(now / 350) * STONE_BOB : 0;
        stone.current.position.y = STONE_HOVER_Y + (BOWL_CENTER.y + 0.03 - STONE_HOVER_Y) * progress + bob;
        stone.current.rotation.y = now / 400;
      }
    }
  });

  if (!scene) return null;
  return (
    <group ref={root}>
      <group scale={MODEL_SCALE}>
        <group rotation={[0, Math.PI, 0]}>
          <group position={[-MODEL_CENTER.x, 0, -MODEL_CENTER.z]}>
            <primitive object={scene} />
            <mesh ref={water} position={[BOWL_CENTER.x, BOWL_CENTER.y, BOWL_CENTER.z]}>
              <cylinderGeometry args={[WATER_RADIUS, WATER_RADIUS, WATER_THICKNESS, 32]} />
              <meshStandardMaterial color={WATER} roughness={0.15} />
            </mesh>
            <mesh ref={stone} position={[BOWL_CENTER.x, STONE_HOVER_Y, BOWL_CENTER.z]}>
              <octahedronGeometry args={[STONE_SIZE, 0]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.5} roughness={0.25} />
            </mesh>
            <group ref={swirl} position={[BOWL_CENTER.x, BOWL_CENTER.y + 0.01, BOWL_CENTER.z]}>
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
      </group>
    </group>
  );
}

export function ToiletFlush({ size, ...toiletProps }: ToiletFlushProps) {
  return (
    <View pointerEvents="none" style={{ width: size, height: size }} accessibilityRole="image">
      <Canvas camera={{ position: cameraPosition(IDLE_CAMERA, TARGET_Y), fov: 32 }} gl={{ antialias: true, alpha: true }} style={styles.canvas}>
        <ambientLight intensity={0.8} />
        <hemisphereLight args={["#e8f2ff", "#8a7f76", 0.6]} />
        <directionalLight position={[2, 5, 4]} intensity={1.3} />
        <Toilet {...toiletProps} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "transparent" },
});
