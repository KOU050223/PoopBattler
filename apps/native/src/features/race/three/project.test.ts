import { describe, expect, it } from "vitest";
import { projectToScreen, type ProjectionCamera, type Viewport } from "./project";

const viewport: Viewport = { width: 400, height: 800 };
const camera: ProjectionCamera = { position: { x: 0, y: 2, z: 0 }, target: { x: 10, y: 2, z: 0 }, fovDeg: 60 };

describe("projectToScreen", () => {
  it("カメラの正面の点は画面の中央に出る", () => {
    const screen = projectToScreen({ x: 20, y: 2, z: 0 }, camera, viewport);

    expect([screen.x, screen.y]).toEqual([200, 400]);
  });

  it("カメラの正面の点は見える", () => {
    expect(projectToScreen({ x: 20, y: 2, z: 0 }, camera, viewport).isVisible).toBe(true);
  });

  it("カメラの背後の点は見えない", () => {
    expect(projectToScreen({ x: -20, y: 2, z: 0 }, camera, viewport).isVisible).toBe(false);
  });

  it("正面より上の点は画面の上半分に出る", () => {
    expect(projectToScreen({ x: 20, y: 4, z: 0 }, camera, viewport).y).toBeLessThan(400);
  });

  it("-x 向きから +z 側にある点は画面の右に出る（右手系で +x を向くと右は +z）", () => {
    expect(projectToScreen({ x: 20, y: 2, z: 3 }, camera, viewport).x).toBeGreaterThan(200);
  });

  it("画角の外にある点は見えない", () => {
    expect(projectToScreen({ x: 10, y: 2, z: 100 }, camera, viewport).isVisible).toBe(false);
  });

  it("縦画角いっぱいの高さの点は画面の上端に出る", () => {
    const distance = 10;
    const halfHeight = Math.tan((camera.fovDeg * Math.PI) / 360) * distance;

    expect(projectToScreen({ x: 10, y: 2 + halfHeight, z: 0 }, camera, viewport).y).toBeCloseTo(0);
  });
});
