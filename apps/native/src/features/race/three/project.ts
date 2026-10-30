// 世界座標 → 画面座標。名札・ゲートの文字・ゴールの文字を RN のオーバーレイで出すための純関数。
// three のカメラ（lookAt・上方向 +y・縦画角 fovDeg）と同じ投影になるようにしてある。
export interface ProjectionCamera {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  /** 縦の画角（度） */
  fovDeg: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  /** カメラの前方向の距離。0 以下はカメラの背後 */
  depth: number;
  /** カメラの前にあり、画面の内側にある */
  isVisible: boolean;
}

const NEAR_PLANE = 0.1;

type Vec3 = { x: number; y: number; z: number };
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
};

export function projectToScreen(world: Vec3, camera: ProjectionCamera, viewport: Viewport): ScreenPoint {
  const forward = normalize({ x: camera.target.x - camera.position.x, y: camera.target.y - camera.position.y, z: camera.target.z - camera.position.z });
  // 真上・真下を向いたときは上方向が定まらないので、z 軸で代用する
  const worldUp: Vec3 = Math.abs(forward.y) > 0.999 ? { x: 0, y: 0, z: -1 } : { x: 0, y: 1, z: 0 };
  const right = normalize(cross(forward, worldUp));
  const up = cross(right, forward);
  const relative = { x: world.x - camera.position.x, y: world.y - camera.position.y, z: world.z - camera.position.z };
  const depth = dot(relative, forward);
  if (depth <= NEAR_PLANE) return { x: 0, y: 0, depth, isVisible: false };
  const tanHalfFov = Math.tan((camera.fovDeg * Math.PI) / 360);
  const aspect = viewport.height > 0 ? viewport.width / viewport.height : 1;
  const ndcX = dot(relative, right) / depth / (tanHalfFov * aspect);
  const ndcY = dot(relative, up) / depth / tanHalfFov;
  return {
    x: ((ndcX + 1) / 2) * viewport.width,
    y: ((1 - ndcY) / 2) * viewport.height,
    depth,
    isVisible: Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1,
  };
}
