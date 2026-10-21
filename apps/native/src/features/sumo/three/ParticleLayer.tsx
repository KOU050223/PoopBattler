import { useFrame, useThree } from "@react-three/fiber/native";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "./camera";
import type { FxPlan } from "./fx";
import {
  addParticles,
  decayLightIntensity,
  flameParticles,
  lifeRemaining,
  MAX_PARTICLES,
  particlesFromPlan,
  stepParticles,
  type Particle,
  type ParticleKind,
  type Rand,
} from "./particles";

export interface ParticleLayerHandle {
  spawn(plan: FxPlan, origin?: Vec3): void;
}

export interface ParticleLayerProps {
  /** 炎の揺らぎ用。既定は呼び出し側で Math.random を渡す */
  rand: Rand;
  /** 熱状態の力士の位置（足元）。空・省略なら炎は出ない */
  hotPositions?: readonly Vec3[];
}

const INSTANCED_KINDS = ["spark", "shard", "drop", "dust", "flame"] as const;
type InstancedKind = (typeof INSTANCED_KINDS)[number];
/** 同時に描くリングの数。リングは個別マテリアルなので少なめに絞る */
const MAX_RINGS = 12;
const FLAMES_PER_SEC_PER_SOURCE = 28;
/** バックグラウンド復帰などで dt が跳ねても粒子が飛ばないように */
const MAX_FRAME_MS = 50;
const FLASH_COLOR = 0xfff0c0;
const FLASH_DISTANCE = 9;
/** 加算合成でないもの(shard/drop/dust)は、不透明度を持てないので寿命の終わりで縮めて消す */
const SHRINK_START = 0.4;

const isAdditiveKind = (kind: InstancedKind): boolean => kind === "spark" || kind === "flame";

function geometryFor(kind: InstancedKind): THREE.BufferGeometry {
  switch (kind) {
    case "shard":
      return new THREE.TetrahedronGeometry(1);
    case "spark":
      return new THREE.OctahedronGeometry(1);
    default:
      return new THREE.SphereGeometry(1, 6, 5);
  }
}

const scratch = new THREE.Object3D();
const scratchColor = new THREE.Color();

export const ParticleLayer = forwardRef<ParticleLayerHandle, ParticleLayerProps>(function ParticleLayer({ rand, hotPositions }, ref) {
  const camera = useThree((state) => state.camera);
  const particlesRef = useRef<Particle[]>([]);
  const flashIntensityRef = useRef(0);
  const flameDebtRef = useRef(0);
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRefs = useRef<Partial<Record<InstancedKind, THREE.InstancedMesh | null>>>({});
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  // 最新の props を useFrame から読む（再購読せずに済む）
  const hotPositionsRef = useRef(hotPositions);
  hotPositionsRef.current = hotPositions;
  const randRef = useRef(rand);
  randRef.current = rand;

  const geometries = useMemo(() => Object.fromEntries(INSTANCED_KINDS.map((kind) => [kind, geometryFor(kind)])) as Record<InstancedKind, THREE.BufferGeometry>, []);
  const ringGeometry = useMemo(() => new THREE.RingGeometry(0.85, 1, 32), []);

  useImperativeHandle(
    ref,
    () => ({
      spawn(plan, origin) {
        particlesRef.current = addParticles(particlesRef.current, particlesFromPlan(plan, origin));
        if (plan.lightFlash && lightRef.current) {
          const { position, intensity } = plan.lightFlash;
          lightRef.current.position.set(position.x + (origin?.x ?? 0), position.y + (origin?.y ?? 0), position.z + (origin?.z ?? 0));
          flashIntensityRef.current = Math.max(flashIntensityRef.current, intensity);
        }
      },
    }),
    [],
  );

  useFrame((_, deltaSec) => {
    const dtMs = Math.min(deltaSec * 1000, MAX_FRAME_MS);

    const sources = hotPositionsRef.current ?? [];
    flameDebtRef.current += (FLAMES_PER_SEC_PER_SOURCE * dtMs * sources.length) / 1000;
    const flameCount = Math.floor(flameDebtRef.current);
    if (flameCount > 0 && sources.length > 0) {
      flameDebtRef.current -= flameCount;
      const perSource = Math.ceil(flameCount / sources.length);
      const flames = sources.flatMap((source) => flameParticles(source, perSource, randRef.current));
      particlesRef.current = addParticles(particlesRef.current, flames);
    } else if (sources.length === 0) {
      flameDebtRef.current = 0;
    }

    particlesRef.current = stepParticles(particlesRef.current, dtMs);
    drawInstanced(particlesRef.current, meshRefs.current);
    drawRings(particlesRef.current, ringRefs.current, camera);

    flashIntensityRef.current = decayLightIntensity(flashIntensityRef.current, dtMs);
    if (lightRef.current) lightRef.current.intensity = flashIntensityRef.current;
  });

  return (
    <group>
      <pointLight ref={lightRef} color={FLASH_COLOR} intensity={0} distance={FLASH_DISTANCE} decay={2} />
      {INSTANCED_KINDS.map((kind) => (
        <instancedMesh
          key={kind}
          ref={(mesh) => {
            meshRefs.current[kind] = mesh;
            if (mesh) mesh.count = 0;
          }}
          args={[geometries[kind], undefined, MAX_PARTICLES]}
          frustumCulled={false}
        >
          <meshBasicMaterial
            transparent
            depthWrite={false}
            blending={isAdditiveKind(kind) ? THREE.AdditiveBlending : THREE.NormalBlending}
            opacity={kind === "dust" ? 0.55 : 1}
          />
        </instancedMesh>
      ))}
      {Array.from({ length: MAX_RINGS }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            ringRefs.current[index] = mesh;
            if (mesh) mesh.visible = false;
          }}
          geometry={ringGeometry}
          frustumCulled={false}
        >
          <meshBasicMaterial transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
});

function drawInstanced(particles: readonly Particle[], meshes: Partial<Record<InstancedKind, THREE.InstancedMesh | null>>): void {
  const counts: Record<ParticleKind, number> = { spark: 0, shard: 0, drop: 0, dust: 0, flame: 0, ring: 0 };
  for (const particle of particles) {
    if (particle.kind === "ring") continue;
    const remaining = lifeRemaining(particle);
    if (remaining <= 0) continue;
    const mesh = meshes[particle.kind];
    if (!mesh) continue;

    const index = counts[particle.kind]++;
    const fade = isAdditiveKind(particle.kind) ? 1 : Math.min(1, remaining / SHRINK_START);
    scratch.position.set(particle.position.x, particle.position.y, particle.position.z);
    scratch.rotation.set(particle.rotation.x, particle.rotation.y, particle.rotation.z);
    scratch.scale.setScalar(particle.scale * fade);
    scratch.updateMatrix();
    mesh.setMatrixAt(index, scratch.matrix);
    // 加算合成は黒に近づけると消えたのと同じになる
    scratchColor.setHex(particle.color).multiplyScalar(isAdditiveKind(particle.kind) ? remaining * particle.opacity : 1);
    mesh.setColorAt(index, scratchColor);
  }
  for (const kind of INSTANCED_KINDS) {
    const mesh = meshes[kind];
    if (!mesh) continue;
    mesh.count = counts[kind];
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

function drawRings(particles: readonly Particle[], rings: readonly (THREE.Mesh | null)[], camera: THREE.Camera): void {
  let used = 0;
  for (const particle of particles) {
    if (particle.kind !== "ring" || used >= rings.length) continue;
    const remaining = lifeRemaining(particle);
    if (remaining <= 0) continue;
    const mesh = rings[used++];
    if (!mesh) continue;
    mesh.visible = true;
    mesh.position.set(particle.position.x, particle.position.y, particle.position.z);
    if (particle.isFlat) mesh.rotation.set(-Math.PI / 2, 0, 0);
    else mesh.quaternion.copy(camera.quaternion);
    mesh.scale.setScalar(particle.scale);
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(particle.color);
    material.opacity = remaining * particle.opacity;
  }
  for (let index = used; index < rings.length; index++) {
    const mesh = rings[index];
    if (mesh) mesh.visible = false;
  }
}
