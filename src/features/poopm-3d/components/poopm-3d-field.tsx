"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { STAGE_GROUND_Y } from "@/features/poopm-3d/poopm-3d.camera";

// 空の色。下半分は地面に隠れるので地平線寄りだけ見える。
const SKY_TOP = "#6dbcef";
const SKY_HORIZON = "#e6f3fc";
// fog は地平線色に合わせて地面の端を空へ溶かす。
const FOG_COLOR = SKY_HORIZON;
const GRASS_BASE = "#79c466";
const GRASS_BLOTCHES = ["#8dd17d", "#69b75b", "#72bf62"];
const TUFT_COLOR = "#5aa74f";

// テクスチャ生成だけは毎回同じ見た目にしたいので固定シードの簡易乱数。
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ほんのり色むらのある草原テクスチャ。小さいcanvasを生成してタイリングする。
function makeGrassTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = GRASS_BASE;
  ctx.fillRect(0, 0, size, size);
  const rng = mulberry32(0xc0ffee);
  for (let i = 0; i < 90; i += 1) {
    const r = 8 + rng() * 26;
    ctx.fillStyle = GRASS_BLOTCHES[i % GRASS_BLOTCHES.length];
    ctx.globalAlpha = 0.06 + rng() * 0.1;
    ctx.beginPath();
    ctx.ellipse(rng() * size, rng() * size, r, r * (0.5 + rng() * 0.7), rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 草の房。キャラの立ち位置（±1.2 以内）を避けて散らす。
const TUFTS: readonly { x: number; z: number; s: number; r: number }[] = [
  { x: -2.6, z: -1.0, s: 1.0, r: 0.4 },
  { x: 2.4, z: 0.6, s: 0.9, r: 2.1 },
  { x: -1.9, z: 1.9, s: 0.8, r: 1.2 },
  { x: 3.4, z: -2.2, s: 1.1, r: 0.9 },
  { x: -3.8, z: -2.8, s: 1.0, r: 2.8 },
  { x: 1.9, z: 2.6, s: 0.85, r: 0.1 },
  { x: -4.4, z: 1.2, s: 1.05, r: 1.7 },
  { x: 4.6, z: 1.4, s: 0.9, r: 2.5 },
  { x: 0.4, z: -3.4, s: 0.95, r: 1.4 },
  { x: -0.9, z: 3.3, s: 0.8, r: 0.6 },
];

const FLOWERS: readonly { x: number; z: number; color: string }[] = [
  { x: -3.1, z: -0.2, color: "#ffd75e" },
  { x: 2.9, z: -0.9, color: "#ff9fb8" },
  { x: -2.2, z: 2.8, color: "#ffffff" },
  { x: 3.9, z: 2.1, color: "#ffd75e" },
  { x: 1.1, z: -3.0, color: "#ff9fb8" },
];

const CLOUDS: readonly { x: number; y: number; z: number; s: number }[] = [
  { x: -7.5, y: 7.2, z: -15, s: 1.3 },
  { x: 6.0, y: 8.6, z: -13, s: 1.0 },
  { x: 0.5, y: 9.5, z: -20, s: 1.6 },
];

const SKY_VERTEX = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  varying vec3 vPos;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  void main() {
    float h = normalize(vPos).y;
    float t = smoothstep(-0.08, 0.42, h);
    gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function Poopm3DField() {
  const grassTexture = useMemo(() => makeGrassTexture(), []);
  const skyMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(SKY_TOP) },
          uHorizon: { value: new THREE.Color(SKY_HORIZON) },
        },
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
      }),
    [],
  );

  const tuftGeometry = useMemo(() => new THREE.ConeGeometry(0.05, 0.24, 5), []);
  const stemGeometry = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 0.16, 5), []);
  const flowerGeometry = useMemo(() => new THREE.IcosahedronGeometry(0.05, 0), []);
  const cloudGeometry = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.55, 12, 8);
    geometry.scale(1, 0.5, 0.8);
    return geometry;
  }, []);

  const tuftMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: TUFT_COLOR, roughness: 1 }),
    [],
  );
  const stemMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#4f9448", roughness: 1 }),
    [],
  );
  const cloudMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.85,
        fog: false,
        depthWrite: false,
      }),
    [],
  );
  const flowerMaterials = useMemo(
    () =>
      FLOWERS.map(
        ({ color }) =>
          new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
      ),
    [],
  );

  useEffect(
    () => () => {
      grassTexture.dispose();
      skyMaterial.dispose();
      tuftGeometry.dispose();
      stemGeometry.dispose();
      flowerGeometry.dispose();
      cloudGeometry.dispose();
      tuftMaterial.dispose();
      stemMaterial.dispose();
      cloudMaterial.dispose();
      for (const material of flowerMaterials) material.dispose();
    },
    [
      grassTexture,
      skyMaterial,
      tuftGeometry,
      stemGeometry,
      flowerGeometry,
      cloudGeometry,
      tuftMaterial,
      stemMaterial,
      cloudMaterial,
      flowerMaterials,
    ],
  );

  return (
    <>
      {/* 空との境目をぼかして奥行きを出す */}
      <fog attach="fog" args={[FOG_COLOR, 13, 30]} />
      <group>
        {/* 空ドーム */}
        <mesh material={skyMaterial} scale={38}>
          <sphereGeometry args={[1, 24, 12]} />
        </mesh>
        {/* 地面まわりは全て接地面（モデル足裏の高さ）に揃える */}
        <group position-y={STAGE_GROUND_Y}>
          {/* 草原 */}
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[26, 48]} />
            <meshStandardMaterial map={grassTexture} roughness={1} />
          </mesh>
          {/* 立ち位置まわりの淡いアリーナ円。ポケモンの円形フィールドっぽさ。
              中心は両者の中間あたり（player z=1.4 / enemy z=-4.4）。 */}
          <mesh
            rotation-x={-Math.PI / 2}
            position={[0, 0.004, -1.5]}
            scale={[1.25, 1, 1]}
          >
            <circleGeometry args={[3.9, 40]} />
            <meshStandardMaterial color="#a3dd93" roughness={1} transparent opacity={0.55} />
          </mesh>

          {/* 草の房（3本の細い円錐を1房として散らす） */}
          {TUFTS.map(({ x, z, s, r }, index) => (
            <group key={index} position={[x, 0, z]} rotation-y={r} scale={s}>
              <mesh
                geometry={tuftGeometry}
                material={tuftMaterial}
                position={[0, 0.1, 0]}
                rotation-z={0.12}
              />
              <mesh
                geometry={tuftGeometry}
                material={tuftMaterial}
                position={[0.08, 0.075, 0.02]}
                rotation-z={-0.35}
                scale={0.8}
              />
              <mesh
                geometry={tuftGeometry}
                material={tuftMaterial}
                position={[-0.07, 0.075, -0.03]}
                rotation-x={-0.25}
                rotation-z={0.3}
                scale={0.8}
              />
            </group>
          ))}

          {/* 点々とした花 */}
          {FLOWERS.map(({ x, z }, index) => (
            <group key={index} position={[x, 0, z]}>
              <mesh
                geometry={stemGeometry}
                material={stemMaterial}
                position={[0, 0.08, 0]}
              />
              <mesh
                geometry={flowerGeometry}
                material={flowerMaterials[index]}
                position={[0, 0.17, 0]}
              />
            </group>
          ))}
        </group>

        {/* 遠くの雲 */}
        {CLOUDS.map(({ x, y, z, s }, index) => (
          <group key={index} position={[x, y, z]} scale={s}>
            <mesh geometry={cloudGeometry} material={cloudMaterial} />
            <mesh
              geometry={cloudGeometry}
              material={cloudMaterial}
              position={[0.6, 0.08, 0.05]}
              scale={0.7}
            />
            <mesh
              geometry={cloudGeometry}
              material={cloudMaterial}
              position={[-0.55, 0.02, -0.05]}
              scale={0.6}
            />
          </group>
        ))}
      </group>
    </>
  );
}
