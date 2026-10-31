import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber/native";
import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  DoubleSide,
  InstancedMesh,
  NearestFilter,
  Object3D,
  PlaneGeometry,
  RGBAFormat,
  UnsignedByteType,
} from "three";

import { COURSE } from "../config";
import { createRng } from "../rng";
import type { Course, CoursePoint, MiniGame, Race, Terrain } from "../types";
import { buildCurb, buildRoad, type RibbonData } from "./course-mesh";
import { loadFaceTexture } from "../../poopm-3d/poopm-3d-face-texture";
import { CROWD, crowdHop, placeCrowd } from "./crowd";
import { CROWD_VARIANTS } from "./crowd-sprite";
import { Scenery3D } from "./Scenery3D";

const crowdAtlasModule: number = require("../../../../assets/race/crowd-atlas.png");
/** 観客の配置のシード。コースが同じなら同じ見た目にする */
const CROWD_SEED = 20260101;
const GATE_COLOR = "#000437";
const POLE_COLOR = "#4b4b4b";
const WATER_COLOR = "#9fd8f2";
const FINISH_COLOR = "#ff7aac";
const GROUND_COLOR = "#a6dc7e";
const GROUND_SIZE = 3000;
const GROUND_Y = -0.05;
const ZONE_GATE_COLORS: Record<MiniGame, string> = { dash: "#ff7aac", hurdle: "#ffa53c", bridge: "#a77b4f", swipe: "#1cb0f6" };
const TERRAIN_SIGN_COLORS: Record<Terrain, string> = { straight: "#8bd17c", uphill: "#ffa53c", snake: "#1cb0f6" };
const GATE = { heightAbove: 3.6, thickness: 0.1, barHeight: 1.3, extraWidth: 1.2, poleHeight: 4.2, poleRadius: 0.1, poleOffset: 0.6 };
const SIGN = { width: 2.6, height: 1.3, heightAbove: 2.2, sideOffset: 1.6 };
const FINISH = { bannerHeightAbove: 4, bannerHeight: 1.4, poleHeight: 4.6, poleRadius: 0.12, poleOffset: 0.5, lineDepth: 1.6, lineLift: 0.04 };
const HURDLE_LOOK = { barRadius: 0.16, barHeightAbove: 0.62, postSize: 0.16, postHeight: 0.7, barColor: "#ffffff", postColor: "#ff7aac" };
const WATER = { length: COURSE.zoneLength - 8, width: 22, y: -0.02 };
const CHECKER = { columns: 16, rows: 4, cellPixels: 4, dark: 0x4b, light: 0xff };

function ribbonGeometry(data: RibbonData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
  geometry.setAttribute("color", new BufferAttribute(data.colors, 3));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

function checkerTexture(): DataTexture {
  const width = CHECKER.columns * CHECKER.cellPixels;
  const height = CHECKER.rows * CHECKER.cellPixels;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isDark = (Math.floor(x / CHECKER.cellPixels) + Math.floor(y / CHECKER.cellPixels)) % 2 === 1;
      const value = isDark ? CHECKER.dark : CHECKER.light;
      pixels.set([value, value, value, 255], (y * width + x) * 4);
    }
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/** 観客のスプライト用の板。アトラスの variant 番目の区画だけを映すように UV を割り当てる */
function spriteGeometry(variant: number): BufferGeometry {
  const geometry = new PlaneGeometry(CROWD.spriteSize, CROWD.spriteSize);
  geometry.translate(0, CROWD.spriteSize / 2, 0);
  const uv = geometry.getAttribute("uv");
  // アトラスは PNG の読み込み順（上の行が先、flipY=false）なので、v は上下を反転して当てる
  for (let i = 0; i < uv.count; i++) {
    uv.setX(i, (variant + uv.getX(i)) / CROWD_VARIANTS);
    uv.setY(i, 1 - uv.getY(i));
  }
  return geometry;
}

/** 道の進行方向 +x、横 +z の局所座標にそろえる土台（three の rotation.y = -h） */
function Oriented({ point, lift = 0, children }: { point: CoursePoint; lift?: number; children: ReactNode }) {
  return (
    <group position={[point.x, point.y + lift, point.z]} rotation-y={-point.h}>
      {children}
    </group>
  );
}

function Pole({ point, side, offset, height, radius }: { point: CoursePoint; side: -1 | 1; offset: number; height: number; radius: number }) {
  return (
    <Oriented point={point}>
      <mesh position={[0, height / 2, side * (point.w / 2 + offset)]}>
        <cylinderGeometry args={[radius, radius, height, 8]} />
        <meshLambertMaterial color={POLE_COLOR} />
      </mesh>
    </Oriented>
  );
}

function Gates({ course }: { course: Course }) {
  return (
    <>
      {course.sections
        .filter((section) => section.kind === "zone" && section.zone)
        .map((section) => {
          const point = course.points[section.startS];
          return (
            <group key={`gate-${section.startS}`}>
              {/* 文字は出さない。種類は色で分かるようにして、文字は後続のオーバーレイで出す */}
              <Oriented point={point} lift={GATE.heightAbove}>
                <mesh>
                  <boxGeometry args={[GATE.thickness, GATE.barHeight, point.w + GATE.extraWidth]} />
                  <meshBasicMaterial color={GATE_COLOR} />
                </mesh>
                <mesh position={[GATE.thickness, 0, 0]}>
                  <boxGeometry args={[GATE.thickness, GATE.barHeight * 0.3, point.w + GATE.extraWidth]} />
                  <meshBasicMaterial color={ZONE_GATE_COLORS[section.zone as MiniGame]} />
                </mesh>
              </Oriented>
              {([-1, 1] as const).map((side) => (
                <Pole key={side} point={point} side={side} offset={GATE.poleOffset} height={GATE.poleHeight} radius={GATE.poleRadius} />
              ))}
            </group>
          );
        })}
    </>
  );
}

function Signs({ course }: { course: Course }) {
  return (
    <>
      {course.sections
        .filter((section) => section.kind === "watch" && section.terrain)
        .map((section) => {
          const point = course.points[section.startS];
          return (
            <Oriented key={`sign-${section.startS}`} point={point} lift={SIGN.heightAbove}>
              <mesh position={[0, 0, point.w / 2 + SIGN.sideOffset]}>
                <boxGeometry args={[GATE.thickness, SIGN.height, SIGN.width]} />
                <meshBasicMaterial color={TERRAIN_SIGN_COLORS[section.terrain as Terrain]} />
              </mesh>
            </Oriented>
          );
        })}
    </>
  );
}

function Bridges({ course }: { course: Course }) {
  return (
    <>
      {course.sections
        .filter((section) => section.zone === "bridge")
        .map((section) => {
          const middle = course.points[Math.floor(section.startS + section.length / 2)];
          return (
            <group key={`water-${section.startS}`} position={[middle.x, WATER.y, middle.z]} rotation-y={-middle.h}>
              <mesh rotation-x={-Math.PI / 2}>
                <planeGeometry args={[WATER.length, WATER.width]} />
                <meshLambertMaterial color={WATER_COLOR} />
              </mesh>
            </group>
          );
        })}
    </>
  );
}

function Hurdles({ course }: { course: Course }) {
  return (
    <>
      {course.hurdles.map((hurdle) => {
        const point = course.points[Math.round(hurdle.s)];
        return (
          <Oriented key={`hurdle-${hurdle.s}`} point={point}>
            <mesh position={[0, HURDLE_LOOK.barHeightAbove, 0]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[HURDLE_LOOK.barRadius, HURDLE_LOOK.barRadius, point.w, 12]} />
              <meshLambertMaterial color={HURDLE_LOOK.barColor} />
            </mesh>
            {([-1, 1] as const).map((side) => (
              <mesh key={side} position={[0, HURDLE_LOOK.postHeight / 2, (side * point.w) / 2]}>
                <boxGeometry args={[HURDLE_LOOK.postSize, HURDLE_LOOK.postHeight, HURDLE_LOOK.postSize]} />
                <meshLambertMaterial color={HURDLE_LOOK.postColor} />
              </mesh>
            ))}
          </Oriented>
        );
      })}
    </>
  );
}

function Lines({ course }: { course: Course }) {
  const texture = useMemo(checkerTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const finish = course.points[Math.floor(course.finishS)];
  return (
    <>
      {[COURSE.startLineS, course.finishS].map((s) => {
        const point = course.points[Math.floor(s)];
        return (
          <Oriented key={`line-${s}`} point={point} lift={FINISH.lineLift}>
            <mesh rotation-x={-Math.PI / 2}>
              <planeGeometry args={[FINISH.lineDepth, point.w]} />
              <meshBasicMaterial map={texture} />
            </mesh>
          </Oriented>
        );
      })}
      <Oriented point={finish} lift={FINISH.bannerHeightAbove}>
        <mesh>
          <boxGeometry args={[GATE.thickness, FINISH.bannerHeight, finish.w + 1]} />
          <meshBasicMaterial color={FINISH_COLOR} />
        </mesh>
      </Oriented>
      {([-1, 1] as const).map((side) => (
        <Pole key={side} point={finish} side={side} offset={FINISH.poleOffset} height={FINISH.poleHeight} radius={FINISH.poleRadius} />
      ))}
    </>
  );
}

/**
 * 観客は絵柄ごとに InstancedMesh 1つ（計4描画）。常にカメラの方を向く板なので、走者の近くが跳ねるのと合わせて毎フレーム行列を書き直す。
 * 半透明の並べ替えは要らないよう、縁は alphaTest で抜く。
 */
function Crowd({ raceRef, isReducedMotion }: { raceRef: RefObject<Race>; isReducedMotion: boolean }) {
  const meshRefs = useRef<(InstancedMesh | null)[]>([]);
  const groups = useMemo(() => {
    const items = placeCrowd(raceRef.current.course.points, createRng(CROWD_SEED));
    return Array.from({ length: CROWD_VARIANTS }, (_, variant) => items.filter((item) => item.variant === variant));
  }, [raceRef]);
  const geometries = useMemo(() => Array.from({ length: CROWD_VARIANTS }, (_, variant) => spriteGeometry(variant)), []);
  const [texture, setTexture] = useState<DataTexture | null>(null);
  useEffect(() => {
    let isAlive = true;
    // 共有キャッシュのテクスチャなので dispose しない。読めなければ観客なしで走れる
    loadFaceTexture(crowdAtlasModule)
      .then((loaded) => isAlive && setTexture(loaded))
      .catch((error: unknown) => console.warn("[race] 観客の画像を読めなかった。観客なしで続ける:", error));
    return () => {
      isAlive = false;
    };
  }, []);
  const dummy = useMemo(() => new Object3D(), []);
  useEffect(
    () => () => {
      geometries.forEach((geometry) => geometry.dispose());
    },
    [geometries],
  );

  useFrame(({ camera }) => {
    const race = raceRef.current;
    const player = race.runners[0];
    groups.forEach((items, variant) => {
      const mesh = meshRefs.current[variant];
      if (!mesh) return;
      items.forEach((item, index) => {
        const hop = crowdHop(item, race.time, Math.hypot(item.x - player.x, item.z - player.z), isReducedMotion);
        dummy.position.set(item.x, item.y + hop, item.z);
        // 縦には倒さず、横方向だけカメラに向ける（見上げても足元が地面から浮かない）
        dummy.rotation.set(0, Math.atan2(camera.position.x - item.x, camera.position.z - item.z), 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  if (!texture) return null;
  return (
    <>
      {groups.map((items, variant) => (
        // 跳ねて境界球から出ることがあるので、カリングは切る（数十個なので描画コストは小さい）
        <instancedMesh key={variant} ref={(mesh) => void (meshRefs.current[variant] = mesh)} args={[geometries[variant], undefined, items.length]} frustumCulled={false}>
          <meshBasicMaterial map={texture} alphaTest={0.5} side={DoubleSide} />
        </instancedMesh>
      ))}
    </>
  );
}

export interface Course3DProps {
  raceRef: RefObject<Race>;
  isReducedMotion: boolean;
}

/** コースの見た目。道・縁石のジオメトリはレース開始時の1回だけ作る */
export function Course3D({ raceRef, isReducedMotion }: Course3DProps) {
  const course = useMemo(() => raceRef.current.course, [raceRef]);
  const geometries = useMemo(
    () => ({
      road: ribbonGeometry(buildRoad(course.points)),
      curbLeft: ribbonGeometry(buildCurb(course.points, -1)),
      curbRight: ribbonGeometry(buildCurb(course.points, 1)),
    }),
    [course],
  );
  useEffect(
    () => () => {
      geometries.road.dispose();
      geometries.curbLeft.dispose();
      geometries.curbRight.dispose();
    },
    [geometries],
  );

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={GROUND_Y}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshLambertMaterial color={GROUND_COLOR} />
      </mesh>
      {Object.values(geometries).map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshLambertMaterial vertexColors side={DoubleSide} />
        </mesh>
      ))}
      <Gates course={course} />
      <Signs course={course} />
      <Bridges course={course} />
      <Hurdles course={course} />
      <Lines course={course} />
      <Scenery3D course={course} />
      <Crowd raceRef={raceRef} isReducedMotion={isReducedMotion} />
    </group>
  );
}
