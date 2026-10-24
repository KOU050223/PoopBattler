import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { decode } from "fast-png";
import { pngToRgba8 } from "./poopm-3d-png-rgba";
import { rgbaToTexture } from "./poopm-3d-rgba-texture";
import type { DataTexture } from "three";

const cache = new Map<number, Promise<DataTexture>>();

// 目・口は10種前後を使い回すのでモジュールIDごとにキャッシュする。共有するため呼び出し側で dispose しない。
export function loadFaceTexture(moduleId: number): Promise<DataTexture> {
  let hit = cache.get(moduleId);
  if (!hit) {
    hit = (async () => {
      const asset = await Asset.fromModule(moduleId).downloadAsync();
      const buffer = await new File(asset.localUri ?? asset.uri).arrayBuffer();
      const png = decode(new Uint8Array(buffer));
      return rgbaToTexture(pngToRgba8(png), png.width, png.height);
    })();
    hit.catch(() => cache.delete(moduleId));
    cache.set(moduleId, hit);
  }
  return hit;
}
