import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D } from "three";

import { createRng } from "../rng";
import type { Course } from "../types";
import { MOUNTAINS, TREES, placeClouds, placeMountains, placeTrees, type SceneryItem } from "./scenery";

/** コースが同じなら同じ景色にする */
const SCENERY_SEED = 20260102;
const TREE_TRUNK_COLOR = "#8a5a3c";
const TREE_CANOPY_COLOR = "#4fae5a";
const MOUNTAIN_COLOR = "#7fb59a";
const MOUNTAIN_CAP_COLOR = "#ffffff";
const CLOUD_COLOR = "#ffffff";
const MOUNTAIN_SEGMENTS = 6;
const CLOUD_SQUASH = { y: 0.35, z: 0.6 };

/** 動かない物なので、行列はマウント時に1回だけ書く。place が1つのアイテムの置き場所・大きさを dummy に書く */
function useStaticInstances(items: readonly SceneryItem[], place: (item: SceneryItem, target: Object3D) => void) {
  const meshRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    items.forEach((item, index) => {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      place(item, dummy);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items, place]);
  return meshRef;
}

function Trees({ items }: { items: readonly SceneryItem[] }) {
  const placeTrunk = useMemo(
    () => (item: SceneryItem, target: Object3D) => {
      target.position.set(item.x, item.y + (TREES.trunkHeight / 2) * item.scale, item.z);
      target.scale.setScalar(item.scale);
    },
    [],
  );
  const placeCanopy = useMemo(
    () => (item: SceneryItem, target: Object3D) => {
      target.position.set(item.x, item.y + (TREES.trunkHeight + TREES.canopyHeight / 2) * item.scale, item.z);
      target.rotation.y = item.yaw;
      target.scale.setScalar(item.scale);
    },
    [],
  );
  const trunkRef = useStaticInstances(items, placeTrunk);
  const canopyRef = useStaticInstances(items, placeCanopy);
  if (items.length === 0) return null;
  return (
    <>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, items.length]} frustumCulled={false}>
        <cylinderGeometry args={[TREES.trunkRadius, TREES.trunkRadius, TREES.trunkHeight, 6]} />
        <meshLambertMaterial color={TREE_TRUNK_COLOR} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, items.length]} frustumCulled={false}>
        <coneGeometry args={[TREES.canopyRadius, TREES.canopyHeight, 7]} />
        <meshLambertMaterial color={TREE_CANOPY_COLOR} />
      </instancedMesh>
    </>
  );
}

/** 山は fog の終わりぎりぎりにあるので fog を掛けず、霞んだ色で遠さを出す */
function Mountains({ items }: { items: readonly SceneryItem[] }) {
  const placeBody = useMemo(
    () => (item: SceneryItem, target: Object3D) => {
      target.position.set(item.x, item.y + item.scale / 2, item.z);
      target.rotation.y = item.yaw;
      target.scale.set(item.scale, item.scale, item.scale);
    },
    [],
  );
  const placeCap = useMemo(
    () => (item: SceneryItem, target: Object3D) => {
      const capHeight = item.scale * MOUNTAINS.capRatio;
      target.position.set(item.x, item.y + item.scale - capHeight / 2, item.z);
      target.rotation.y = item.yaw;
      target.scale.set(item.scale, item.scale, item.scale);
    },
    [],
  );
  const bodyRef = useStaticInstances(items, placeBody);
  const capRef = useStaticInstances(items, placeCap);
  if (items.length === 0) return null;
  // 単位の円錐（高さ1）を item.scale 倍して使う。雪は先端の capRatio だけを同じ傾斜で切り出した円錐
  return (
    <>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, items.length]} frustumCulled={false}>
        <coneGeometry args={[MOUNTAINS.radiusRatio, 1, MOUNTAIN_SEGMENTS]} />
        <meshBasicMaterial color={MOUNTAIN_COLOR} fog={false} />
      </instancedMesh>
      <instancedMesh ref={capRef} args={[undefined, undefined, items.length]} frustumCulled={false}>
        <coneGeometry args={[MOUNTAINS.radiusRatio * MOUNTAINS.capRatio * 1.02, MOUNTAINS.capRatio, MOUNTAIN_SEGMENTS]} />
        <meshBasicMaterial color={MOUNTAIN_CAP_COLOR} fog={false} />
      </instancedMesh>
    </>
  );
}

function Clouds({ items }: { items: readonly SceneryItem[] }) {
  const place = useMemo(
    () => (item: SceneryItem, target: Object3D) => {
      target.position.set(item.x, item.y, item.z);
      target.rotation.y = item.yaw;
      target.scale.set(item.scale, item.scale * CLOUD_SQUASH.y, item.scale * CLOUD_SQUASH.z);
    },
    [],
  );
  const meshRef = useStaticInstances(items, place);
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, items.length]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 8, 6]} />
      <meshBasicMaterial color={CLOUD_COLOR} fog={false} />
    </instancedMesh>
  );
}

/** 背景の自然。木2・山2・雲1の計5描画にまとめ、配置はレース開始時の1回だけ */
export function Scenery3D({ course }: { course: Course }) {
  const scenery = useMemo(
    () => ({
      trees: placeTrees(course.points, createRng(SCENERY_SEED)),
      mountains: placeMountains(course.points, createRng(SCENERY_SEED + 1)),
      clouds: placeClouds(course.points, createRng(SCENERY_SEED + 2)),
    }),
    [course],
  );
  return (
    <group>
      <Mountains items={scenery.mountains} />
      <Trees items={scenery.trees} />
      <Clouds items={scenery.clouds} />
    </group>
  );
}
