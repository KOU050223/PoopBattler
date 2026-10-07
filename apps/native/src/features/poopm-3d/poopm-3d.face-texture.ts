import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { decode } from "fast-png";
import { pngToRgba8 } from "./poopm-3d.png-rgba";
import { DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType } from "three";

// RN には ImageLoader / DOM が無く TextureLoader が使えない。PNG を純JSでデコードして DataTexture にする。
export function rgbaToTexture(rgba: Uint8Array, width: number, height: number): DataTexture {
  const texture = new DataTexture(rgba, width, height, RGBAFormat, UnsignedByteType);
  // glTF の UV は flipY=false 前提（web と同じ）。
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

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
