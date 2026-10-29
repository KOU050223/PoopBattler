import { useFrame } from "@react-three/fiber/native";
import type { RefObject } from "react";
import type { PerspectiveCamera } from "three";

import type { CameraOutput } from "../camera";

export interface CameraRigProps {
  cameraRef: RefObject<CameraOutput | null>;
}

/**
 * director（camera.ts）が返した位置・注視点・画角をそのまま three のカメラへ写す。
 * 補間は director 側でやっている（切り替えのフレームだけ isCut で飛ぶ）ので、ここでは平滑化しない。
 * 二重に補間すると、カットのたびに前のカメラからゆっくり寄ってしまう
 */
export function CameraRig({ cameraRef }: CameraRigProps) {
  useFrame((state) => {
    const output = cameraRef.current;
    if (!output) return;
    const camera = state.camera as PerspectiveCamera;
    camera.position.set(output.position.x, output.position.y, output.position.z);
    camera.lookAt(output.target.x, output.target.y, output.target.z);
    if (camera.fov !== output.fovDeg) {
      camera.fov = output.fovDeg;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
