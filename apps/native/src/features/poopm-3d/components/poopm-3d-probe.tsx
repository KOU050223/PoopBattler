// T-010a 検証用。画面からは参照しない（export で GLB がバンドル解決されることの確認用）。
import { Canvas, useFrame } from "@react-three/fiber/native";
import { useEffect, useRef, useState } from "react";
import { Box3, Vector3, type Group } from "three";

import { cloneGlbScene, loadGlb } from "../poopm-3d.glb-loader";
import { poopm3DBaseGlb } from "../poopm-3d.assets";

function ProbeModel() {
  const [scene, setScene] = useState<Group>();

  useEffect(() => {
    let alive = true;
    loadGlb(poopm3DBaseGlb())
      .then((gltf) => {
        if (!alive) return;
        const scene = cloneGlbScene(gltf);
        let meshCount = 0;
        const names: string[] = [];
        scene.traverse((o) => {
          const mesh = o as { isMesh?: boolean; isSkinnedMesh?: boolean; frustumCulled?: boolean };
          if (mesh.isMesh) {
            meshCount += 1;
            mesh.frustumCulled = false;
            // 検証: スキニング経路が潰れているか切り分けるため一時的に無効化
            (o as { isSkinnedMesh?: boolean }).isSkinnedMesh = false;
            names.push(`${o.name}${mesh.isSkinnedMesh ? "(skinned)" : ""}`);
          }
        });
        const box = new Box3().setFromObject(scene);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());
        console.warn(`[probe] meshes=${meshCount} names=${names.join(",")} center=${center.toArray().map((v) => v.toFixed(2))} size=${size.toArray().map((v) => v.toFixed(2))}`);
        setScene(scene);
      })
      .catch((e) => console.warn("[probe] GLB load failed:", e));
    return () => {
      alive = false;
    };
  }, []);

  return scene ? <primitive object={scene} /> : null;
}

function FrameLogger() {
  const count = useRef(0);
  useFrame(({ gl }) => {
    count.current += 1;
    if (count.current === 1 || count.current === 60) {
      const info = gl.info.render;
      console.warn(`[probe] v4 frame ${count.current} calls=${info.calls} tris=${info.triangles}`);
    }
  });
  return null;
}

export function Poopm3DProbe() {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 6], fov: 30 }}
      onCreated={(state) => console.warn("[probe] created, ctx=", !!state.gl.getContext())}
    >
      <FrameLogger />
      <color attach="background" args={["#117744"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 4, 3]} intensity={1.5} />
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="tomato" />
      </mesh>
      <ProbeModel />
    </Canvas>
  );
}
