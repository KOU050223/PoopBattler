import type { Poopm3DMotionRequest } from "@/features/poopm-3d/components/poopm-3d-model";
import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";

export type StageSide = "player" | "enemy";

export type StageMotions = Record<StageSide, Poopm3DMotionRequest>;

type Vec3 = [number, number, number];

// GLBモデル空間での足先の高さ（頭頂は y≈0.63）。設置 position.y + この値×scale が
// キャラの足裏になる。モデル原点は頭側なので、原点=地面ではなく足先を基準に揃える。
const MODEL_FEET_Y = -2.25;

export const PLAYER_SCALE = 1.0;
export const ENEMY_SCALE = 1.0;

export const SIDE_SCALE: Record<StageSide, number> = {
  player: PLAYER_SCALE,
  enemy: ENEMY_SCALE,
};

// ステージの接地面。味方の足裏を基準にし、敵は position.y をずらして
// 同じ面に立たせる（スケールが違うと足裏の高さがずれるため）。
export const STAGE_GROUND_Y = MODEL_FEET_Y * PLAYER_SCALE;

// モデル空間での注視点。head は顔まわり、body は全身を収める胴中央。
const MODEL_HEAD_Y = 0.1;
const MODEL_BODY_Y = -0.85;

// モデルの設置位置。poopm-3d-stage.tsx の <Poopm3DModel position> と常に一致させる。
// head/body はモデル空間の注視点に scale を掛け設置高を足したワールド座標。
export const STAGE_ANCHOR: Record<
  StageSide,
  { position: Vec3; head: number; body: number }
> = {
  player: {
    position: [-0.75, 0, 1.0],
    head: MODEL_HEAD_Y * PLAYER_SCALE,
    body: MODEL_BODY_Y * PLAYER_SCALE,
  },
  enemy: {
    position: [
      0.9,
      STAGE_GROUND_Y - MODEL_FEET_Y * ENEMY_SCALE,
      -2.7,
    ],
    head:
      STAGE_GROUND_Y - MODEL_FEET_Y * ENEMY_SCALE + MODEL_HEAD_Y * ENEMY_SCALE,
    body:
      STAGE_GROUND_Y - MODEL_FEET_Y * ENEMY_SCALE + MODEL_BODY_Y * ENEMY_SCALE,
  },
};

// デフォルトのワイドショット。全キューの帰着先で、Canvas の初期カメラとも一致させる。
export const STAGE_CAMERA_WIDE = {
  position: [0.15, 3.4, 9.6],
  lookAt: [0.1, -0.6, -0.8],
  fov: 30,
} as const;

export type CameraHold =
  | { kind: "timed"; seconds: number }
  // モーションが続く限り保持する（special_charge / win / lose など）。
  | { kind: "while" };

// カメラキュー。useFrame がこの目標へ補間し、hold が切れたらワイドへ戻る。
export type StageCameraCue = {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
  // 被弾シェイクの強さ。0 = 揺れなし。reduced-motion では soften で 0 になる。
  shake: number;
  hold: CameraHold;
  // 同時に複数キューが出たときの取り合い。大きい方が優先。
  priority: number;
  source: { side: StageSide; name: Poopm3DBattleMotion };
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec(a: readonly number[], b: readonly number[], t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function length2(x: number, z: number): number {
  return Math.hypot(x, z);
}

// キャラの立ち位置からワイドショットのカメラへ向かうXZ方向。
// 「そのキャラへ寄る」= この方向へ anchor から dist だけ戻った位置に置く。
function cameraDirection(side: StageSide): [number, number] {
  const anchor = STAGE_ANCHOR[side].position;
  const dx = STAGE_CAMERA_WIDE.position[0] - anchor[0];
  const dz = STAGE_CAMERA_WIDE.position[2] - anchor[2];
  const len = length2(dx, dz);
  return [dx / len, dz / len];
}

type PushSpec = {
  // anchor からカメラ方向へどれだけ離すか（小さい = 寄る）。
  dist: number;
  height: number;
  fov: number;
  // 注視点の高さ。省略時は胴中央（全身が画角に収まる）。
  lookY?: number;
  // カメラ方向をキャラ回りに回す角度（度）。special_fire の回り込みに使う。
  swingDeg?: number;
  shake?: number;
  hold: CameraHold;
  priority: number;
};

function pushShot(
  motion: Poopm3DBattleMotion,
  side: StageSide,
  spec: PushSpec,
): StageCameraCue {
  const anchor = STAGE_ANCHOR[side];
  const [dx, dz] = cameraDirection(side);
  // 大きいキャラほど同じ画角を取るのに距離が要るため、スケール比で伸ばす。
  const dist = spec.dist * (SIDE_SCALE[side] / PLAYER_SCALE);
  const rad = ((spec.swingDeg ?? 0) * Math.PI) / 180;
  const rx = dx * Math.cos(rad) + dz * Math.sin(rad);
  const rz = -dx * Math.sin(rad) + dz * Math.cos(rad);
  return {
    position: [
      anchor.position[0] + rx * dist,
      // height は「設置位置からの高さ」として扱い、接地補正で浮いた
      // 個体（大型の敵）でも顔の高さが追従するようにする。
      spec.height + anchor.position[1],
      anchor.position[2] + rz * dist,
    ],
    lookAt: [anchor.position[0], spec.lookY ?? anchor.body, anchor.position[2]],
    fov: spec.fov,
    shake: spec.shake ?? 0,
    hold: spec.hold,
    priority: spec.priority,
    source: { side, name: motion },
  };
}

// モーション → カメラキューの対応。優先度は「同じ tick に出る組み合わせ」で
// 意味が通る順に決める（attack > hit で攻撃側へ寄る、fire > hit で発射を見せる、
// 終端の lose > win > ko）。
export function stageCameraCue(
  motion: Poopm3DBattleMotion,
  side: StageSide,
): StageCameraCue | null {
  switch (motion) {
    case "attack":
      return pushShot(motion, side, {
        dist: 4.4,
        height: 0.6,
        fov: 34,
        hold: { kind: "timed", seconds: 0.55 },
        priority: 20,
      });
    case "hit":
      return pushShot(motion, side, {
        dist: 5.2,
        height: 0.8,
        fov: 31,
        shake: 0.16,
        hold: { kind: "timed", seconds: 0.4 },
        priority: 10,
      });
    case "special_charge":
      return pushShot(motion, side, {
        dist: 4.3,
        height: 0.45,
        fov: 36,
        hold: { kind: "while" },
        priority: 5,
      });
    case "special_fire":
      return pushShot(motion, side, {
        dist: 3.8,
        height: 0.6,
        fov: 38,
        swingDeg: 38,
        hold: { kind: "timed", seconds: 0.85 },
        priority: 30,
      });
    case "swap_in":
    case "swap_out":
      return pushShot(motion, side, {
        dist: 5.0,
        height: 1.0,
        fov: 32,
        hold: { kind: "timed", seconds: 0.8 },
        priority: 15,
      });
    case "ko":
      return pushShot(motion, side, {
        dist: 3.4,
        height: -1.3,
        lookY: STAGE_GROUND_Y + 0.35,
        fov: 32,
        hold: { kind: "timed", seconds: 1.2 },
        priority: 40,
      });
    case "win":
      return pushShot(motion, side, {
        dist: 4.0,
        height: 0.9,
        fov: 33,
        hold: { kind: "while" },
        priority: 48,
      });
    case "lose":
      // 敗北は寄るより引いて見下ろす方が絵になるため、ワイドを更に上げた俯瞰。
      return {
        position: [0.2, 2.6, 9.6],
        lookAt: [0, STAGE_GROUND_Y + 0.4, -0.4],
        fov: 28,
        shake: 0,
        hold: { kind: "while" },
        priority: 50,
        source: { side, name: motion },
      };
    default:
      return null;
  }
}

// 前回値との差分で、モーションが変わったサイドを返す。
// 初回（prev=null）は両方を「変わった」と見なす。
export function diffCameraSides(
  prev: StageMotions | null,
  next: StageMotions,
): StageSide[] {
  const sides: StageSide[] = ["player", "enemy"];
  if (!prev) return sides;
  return sides.filter(
    (side) =>
      prev[side].name !== next[side].name || prev[side].nonce !== next[side].nonce,
  );
}

export type CameraCueResolution = {
  // 新たに採用するキュー。なければ null。
  cue: StageCameraCue | null;
  // 保持中の while キューを手放すべきか（溜め解除・終端後の解除など）。
  release: boolean;
};

// 変わったサイドのモーションから次のカメラキューを決める。
// 新しいキューは常に現在のキューを置き換える（イベントは新しい方を映す）。
export function resolveCameraCue(
  changed: readonly StageSide[],
  motions: StageMotions,
  active: StageCameraCue | null,
): CameraCueResolution {
  let best: StageCameraCue | null = null;
  for (const side of changed) {
    const cue = stageCameraCue(motions[side].name, side);
    if (cue && (!best || cue.priority > best.priority)) {
      best = cue;
    }
  }
  if (best) return { cue: best, release: false };

  if (active && active.hold.kind === "while") {
    // 同名の再トリガー（nonceのみ変化）は同じモーションの続行と見なして保持する。
    const source = active.source;
    if (motions[source.side].name !== source.name) {
      return { cue: null, release: true };
    }
  }
  return { cue: null, release: false };
}

// prefers-reduced-motion 用: キューの寄り・ズームを amount 分だけワイド側へ
// 寄せて弱め、シェイクは消す。
export function softenStageCameraCue(
  cue: StageCameraCue,
  amount = 0.35,
): StageCameraCue {
  return {
    ...cue,
    position: lerpVec(STAGE_CAMERA_WIDE.position, cue.position, amount),
    lookAt: lerpVec(STAGE_CAMERA_WIDE.lookAt, cue.lookAt, amount),
    fov: lerp(STAGE_CAMERA_WIDE.fov, cue.fov, amount),
    shake: 0,
  };
}
