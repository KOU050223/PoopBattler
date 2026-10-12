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
