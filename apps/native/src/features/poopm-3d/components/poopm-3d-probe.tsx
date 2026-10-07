// T-010a 検証用。画面からは参照しない（export で GLB がバンドル解決されることの確認用）。
import { Canvas } from "@react-three/fiber/native";
import { useEffect, useState } from "react";
import type { Group } from "three";

import { cloneGlbScene, loadGlb } from "../poopm-3d.glb-loader";
import { poopm3DBaseGlb } from "../poopm-3d.assets";

function ProbeModel() {
  const [scene, setScene] = useState<Group>();

  useEffect(() => {
    let alive = true;
    loadGlb(poopm3DBaseGlb())
      .then((gltf) => alive && setScene(cloneGlbScene(gltf)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return scene ? <primitive object={scene} /> : null;
}

export function Poopm3DProbe() {
  return (
    <Canvas camera={{ position: [0, 0.5, 6], fov: 30 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 4, 3]} intensity={1.5} />
      <ProbeModel />
    </Canvas>
  );
}
