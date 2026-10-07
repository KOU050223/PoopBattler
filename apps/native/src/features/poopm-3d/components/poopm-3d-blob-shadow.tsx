import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { STAGE_GROUND_Y } from "../poopm-3d.camera";

const SIZE = 128;

// 放射グラデの接地影。RN には canvas が無いので alpha をピクセル配列へ直接書く
// （色は固定で alpha だけ変える。web 版の gradient と同じ停止点）。
function makeShadowTexture(): THREE.DataTexture {
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const d = Math.hypot(x + 0.5 - SIZE / 2, y + 0.5 - SIZE / 2);
      let alpha = 0;
      if (d <= 10) alpha = 0.42;
      else if (d < 62) {
        const t = (d - 10) / 52;
        alpha = t < 0.55 ? lerp(0.42, 0.2, t / 0.55) : lerp(0.2, 0, (t - 0.55) / 0.45);
      }
      const o = (y * SIZE + x) * 4;
      pixels[o] = 45;
      pixels[o + 1] = 70;
      pixels[o + 2] = 40;
      pixels[o + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(pixels, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// 接地影。ContactShadows は深度パスが空になる事象があったため簡易ブロブで置く。
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
  const texture = useMemo(makeShadowTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, y + 0.012, z]} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
