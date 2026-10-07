"use client";

import { useMemo } from "react";
import * as THREE from "three";

import { STAGE_GROUND_Y } from "@/features/poopm-3d/poopm-3d.camera";

// 接地影。drei の ContactShadows は奥行きのある位置で深度パスが空に
// なる事象があったため、放射グラデの簡易ブロブで置く。フラットな絵柄に
// も合い、配置の決定論が利く。
export function Poopm3DBlobShadow({
  x,
  z,
  y = STAGE_GROUND_Y,
  size = 2.8,
}: {
  x: number;
  z: number;
  y?: number;
  size?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
    gradient.addColorStop(0, "rgba(45, 70, 40, 0.42)");
    gradient.addColorStop(0.55, "rgba(45, 70, 40, 0.2)");
    gradient.addColorStop(1, "rgba(45, 70, 40, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  if (!texture) return null;
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, y + 0.012, z]} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
