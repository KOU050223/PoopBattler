import { Poopm3DBlobShadow } from "@/features/poopm-3d/components/poopm-3d-blob-shadow";

import { TOILET_X, TOP } from "./constants";

// 値は試作の three.js 部分に合わせる。shadowMap は RN の GL で重いので使わず、足元は簡易影で代替する
const BACKGROUND_COLOR = "#1d1510";
const FOG_NEAR = 14;
const FOG_FAR = 30;

const TASSEL_POSITIONS = [
  { x: 7, z: 7, color: "#2f9e7a" },
  { x: -7, z: 7, color: "#d94a3a" },
  { x: -7, z: -7, color: "#eeeeee" },
  { x: 7, z: -7, color: "#222222" },
] as const;

const START_LINE_X = [-0.45, 0.45] as const;
const TOILET_SIDES = [-1, 1] as const;

function Toilet({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * TOILET_X, 0, 0]}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.85, 0.5, 0.9, 28]} />
        <meshStandardMaterial color="#f5f2ea" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.86, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.66, 28]} />
        <meshStandardMaterial color="#7cc0e0" roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.92, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.76, 0.09, 10, 32]} />
        <meshStandardMaterial color="#f5f2ea" roughness={0.25} />
      </mesh>
      {/* タンクは土俵と反対側（外側）に立てる */}
      <mesh position={[side * 1.05, 1.0, 0]}>
        <boxGeometry args={[0.45, 1.2, 1.3]} />
        <meshStandardMaterial color="#f5f2ea" roughness={0.25} />
      </mesh>
    </group>
  );
}

/** 床・土俵・俵・屋根・便器・ライト・フォグ・背景。力士は含まない */
export function Dohyo() {
  return (
    <>
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <fog attach="fog" args={[BACKGROUND_COLOR, FOG_NEAR, FOG_FAR]} />
      <hemisphereLight args={["#fff1dc", "#3a2a1e", 0.5]} />
      <directionalLight position={[-3, 12, 4]} color="#fff0d8" intensity={0.75} />

      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#2b1f17" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[14.4, 1, 14.4]} />
        <meshStandardMaterial color="#9c7550" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[6.8, 6.8, 0.04, 72]} />
        <meshStandardMaterial color="#a47c55" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.08, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[5.95, 0.14, 8, 96]} />
        <meshStandardMaterial color="#dcc78d" roughness={0.8} />
      </mesh>
      {START_LINE_X.map((x) => (
        <mesh key={x} position={[x, TOP, 0]}>
          <boxGeometry args={[0.06, 0.02, 0.8]} />
          <meshStandardMaterial color="#f7f2e6" roughness={0.8} />
        </mesh>
      ))}

      <mesh position={[0, 8.5, 0]}>
        <boxGeometry args={[15, 0.5, 15]} />
        <meshStandardMaterial color="#3d2a3a" roughness={0.8} />
      </mesh>
      {TASSEL_POSITIONS.map(({ x, z, color }) => (
        <mesh key={`${x},${z}`} position={[x, 7.3, z]}>
          <cylinderGeometry args={[0.18, 0.32, 1.8, 10]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}

      {TOILET_SIDES.map((side) => (
        <Toilet key={side} side={side} />
      ))}
    </>
  );
}

/** 力士の足元に敷く簡易影。力士の root 直下に置く（root が土俵上面の高さにある前提） */
export function RikishiShadow() {
  return <Poopm3DBlobShadow x={0} z={0} y={0} size={2.2} />;
}
