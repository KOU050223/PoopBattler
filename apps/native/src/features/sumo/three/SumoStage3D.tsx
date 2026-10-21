import { Canvas, useFrame } from "@react-three/fiber/native";
import { useImperativeHandle, useRef, type ReactNode, type RefObject } from "react";
import type { PerspectiveCamera } from "three";

import type { Game, Side, Species } from "../types";
import { addYaw, baseFov, cameraTarget, decayFovKick, decayShake, stepCamera, stepCamYaw, stepYaw, type CameraRig, type Vec3 } from "./camera";
import { Dohyo } from "./Dohyo";
import type { FxPlan } from "./fx";
import { fallLoser, INITIAL_POSE_SMOOTHING, poseFighter, type PoseSmoothing } from "./pose";
import { Rikishi, type RikishiHandle } from "./Rikishi";

/** バックグラウンド復帰などで巨大な経過時間が来ても、カメラや平滑化を一気に進めない */
const MAX_FRAME_MS = 100;
const SHAKE_AMPLITUDE = 0.3;
const SHAKE_FREQUENCY_X = 0.09;
const SHAKE_FREQUENCY_Y = 0.13;
const INITIAL_CAMERA_POSITION: [number, number, number] = [0, 5, 5.2];
const INITIAL_FOV = 62;

/** 親から FX の画面側の効果（回り込み・揺れ・FOV キック）を流し込む口 */
export interface SumoStageHandle {
  applyFxPlan(plan: FxPlan): void;
}

export interface SumoStage3DProps {
  gameRef: RefObject<Game>;
  playerSpecies: Species;
  opponentSpecies: Species;
  /** 立ち合い前・メニューの静かな構えにする */
  isPreFight?: boolean;
  stageHandleRef?: RefObject<SumoStageHandle | null>;
  /** pose 平滑化の dt に掛ける倍率（スローモー・モードの時間倍率込み）。省略は 1 */
  timeScaleRef?: RefObject<number>;
  /** Canvas 内に描く。粒子層などの差し込み口 */
  children?: ReactNode;
}

interface FallRecord {
  loserSide: Side;
  from: Vec3;
  startedAtMs: number;
}

/** 状態はすべて ref。毎フレームの更新で React を再描画させない */
function StageRig({ gameRef, isPreFight, stageHandleRef, timeScaleRef, rikishiRefs }: Pick<SumoStage3DProps, "gameRef" | "isPreFight" | "stageHandleRef" | "timeScaleRef"> & { rikishiRefs: RefObject<(RikishiHandle | null)[]> }) {
  const yawRef = useRef({ yaw: 0, yawTarget: 0, camYaw: 0 });
  const effectsRef = useRef({ shake: 0, fovKick: 0 });
  const smoothingRef = useRef<[PoseSmoothing, PoseSmoothing]>([INITIAL_POSE_SMOOTHING, INITIAL_POSE_SMOOTHING]);
  const cameraRigRef = useRef<CameraRig | null>(null);
  const fallRef = useRef<FallRecord | null>(null);

  useImperativeHandle(
    stageHandleRef,
    () => ({
      applyFxPlan(plan) {
        const orientation = yawRef.current;
        orientation.yawTarget = addYaw(orientation.yawTarget, plan.yawDelta);
        // 複数イベントが重なったら大きい方を採る（fx.ts の shake と同じ扱い）
        effectsRef.current.shake = Math.max(effectsRef.current.shake, plan.shake);
        effectsRef.current.fovKick = Math.max(effectsRef.current.fovKick, plan.fovKick);
      },
    }),
    [],
  );

  useFrame((state, deltaSeconds) => {
    const game = gameRef.current;
    const camera = state.camera as PerspectiveCamera;
    const dtMs = Math.min(MAX_FRAME_MS, deltaSeconds * 1000);
    const nowMs = state.clock.elapsedTime * 1000;
    const orientation = yawRef.current;
    const effects = effectsRef.current;

    orientation.yaw = stepYaw(orientation.yaw, orientation.yawTarget, dtMs);
    orientation.camYaw = stepCamYaw(orientation.camYaw, orientation.yaw, dtMs);

    // 試作は pose 平滑化にだけスローモー込みの dt を使う。カメラ・揺れは実時間のまま
    const poseDtMs = dtMs * (timeScaleRef?.current ?? 1);
    const poses = ([0, 1] as const).map((side) => {
      const result = poseFighter({ fighter: game.f[side], game, nowMs, dtMs: poseDtMs, yaw: orientation.yaw, smoothing: smoothingRef.current[side], isPreFight });
      smoothingRef.current[side] = result.smoothing;
      rikishiRefs.current[side]?.apply(result.pose);
      return result.pose;
    });

    if (game.winner === null) {
      fallRef.current = null;
    } else {
      const loserSide: Side = game.winner === 0 ? 1 : 0;
      // 落下の出発点は決着した瞬間の位置で固定する（毎フレーム現在位置から始めるとずれ続ける）
      fallRef.current ??= { loserSide, from: poses[loserSide].position, startedAtMs: nowMs };
      const fall = fallRef.current;
      rikishiRefs.current[fall.loserSide]?.applyFall(fallLoser(fall.from, fall.loserSide, nowMs - fall.startedAtMs));
    }

    const aspect = state.size.height > 0 ? state.size.width / state.size.height : 1;
    const target = cameraTarget({ aspect, camYaw: orientation.camYaw, eastPosition: poses[0].position, westPosition: poses[1].position, winner: game.winner });
    const isFirstFrame = cameraRigRef.current === null;
    const rig = stepCamera(cameraRigRef.current ?? target, target, dtMs, isFirstFrame);
    cameraRigRef.current = rig;

    effects.shake = decayShake(effects.shake, dtMs);
    effects.fovKick = decayFovKick(effects.fovKick, dtMs);
    // 乱数は使わず、位相の違う sin で揺らす（テスト・再現性のため）
    const shakeX = Math.sin(nowMs * SHAKE_FREQUENCY_X) * effects.shake * SHAKE_AMPLITUDE;
    const shakeY = Math.sin(nowMs * SHAKE_FREQUENCY_Y + 1.7) * effects.shake * SHAKE_AMPLITUDE;
    camera.position.set(rig.position.x + shakeX, rig.position.y + shakeY, rig.position.z);
    camera.lookAt(rig.lookAt.x, rig.lookAt.y, rig.lookAt.z);
    const fov = baseFov(aspect) + effects.fovKick;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

export function SumoStage3D({ gameRef, playerSpecies, opponentSpecies, isPreFight = false, stageHandleRef, timeScaleRef, children }: SumoStage3DProps) {
  const rikishiRefs = useRef<(RikishiHandle | null)[]>([null, null]);
  // 東 = プレイヤー、西 = 相手（session.PLAYER_SIDE = 0）
  const species = [playerSpecies, opponentSpecies] as const;

  return (
    <Canvas
      // 位置と FOV は初回フレームで StageRig が上書きする。near/far は土俵上面(+0.02 の粘土円盤)の
      // z-fighting を避けつつ、fog(30) を越える遠方を描かない範囲にしている
      camera={{ position: INITIAL_CAMERA_POSITION, fov: INITIAL_FOV, near: 0.5, far: 60 }}
      gl={{ antialias: true }}
      style={{ flex: 1 }}
    >
      <Dohyo />
      {species.map((sp, side) => (
        <Rikishi
          key={side}
          species={sp}
          ref={(handle) => {
            rikishiRefs.current[side] = handle;
          }}
        />
      ))}
      <StageRig gameRef={gameRef} isPreFight={isPreFight} stageHandleRef={stageHandleRef} timeScaleRef={timeScaleRef} rikishiRefs={rikishiRefs} />
      {children}
    </Canvas>
  );
}
