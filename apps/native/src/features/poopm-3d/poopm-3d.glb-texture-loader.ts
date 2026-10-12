import { decode } from "fast-png";
import { DataTexture, Loader } from "three";

import { pngToRgba8 } from "./poopm-3d.png-rgba";
import { rgbaToTexture } from "./poopm-3d.rgba-texture";

const DATA_URI_PNG = /^data:image\/png;base64,/;

export function dataUriToBytes(uri: string): Uint8Array {
  if (!DATA_URI_PNG.test(uri)) {
    // blob: URL は RN では読めない。ここに来たら URL.createObjectURL の polyfill が変わっている。
    throw new Error(`unsupported texture URI (expected PNG data URI): ${uri.slice(0, 32)}`);
  }
  const binary = atob(uri.replace(DATA_URI_PNG, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function decodePngDataUri(uri: string): DataTexture {
  const png = decode(dataUriToBytes(uri));
  return rgbaToTexture(pngToRgba8(png), png.width, png.height);
}

/**
 * GLTFLoader の textureLoader 差し替え用。RN には Image/ImageBitmap が無く、標準の TextureLoader では
 * GLB 埋め込み PNG が読めない。しかも GLTFLoader は1枚の失敗で parse 全体を reject するため、
 * 本体モデルごと描画されなくなる。
 */
export class PngDataUriTextureLoader extends Loader<DataTexture, string> {
  load(url: string, onLoad: (texture: DataTexture) => void, _onProgress?: unknown, onError?: (error: unknown) => void): DataTexture {
    try {
      const texture = decodePngDataUri(url);
      onLoad(texture);
      return texture;
    } catch (error) {
      onError?.(error);
      throw error;
    }
  }
}
