import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import type { Group } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

// RN の fetch は file:// を扱えないため FileLoader/load() を使わず、
// ローカルへ展開したファイルをバイト列で読んで parse() に渡す。
export async function loadGlbArrayBuffer(moduleId: number): Promise<ArrayBuffer> {
  const asset = await Asset.fromModule(moduleId).downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return new File(uri).arrayBuffer();
}

export function parseGlb(buffer: ArrayBuffer): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(buffer, "", resolve, reject);
  });
}

const cache = new Map<number, Promise<GLTF>>();

// 同じGLBは1回だけデコードして使い回す。失敗はキャッシュしない（再試行できるように）。
export function loadGlb(moduleId: number): Promise<GLTF> {
  let hit = cache.get(moduleId);
  if (!hit) {
    hit = loadGlbArrayBuffer(moduleId).then(parseGlb);
    hit.catch(() => cache.delete(moduleId));
    cache.set(moduleId, hit);
  }
  return hit;
}

// スキニング付きシーンは単純な clone() だと骨が共有されるため SkeletonUtils で複製する。
export function cloneGlbScene(gltf: GLTF): Group {
  return clone(gltf.scene) as Group;
}
