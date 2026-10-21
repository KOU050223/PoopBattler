import type { DecodedPng } from "fast-png";

// RN には ImageLoader / DOM が無く TextureLoader が使えない。PNG を純JSでデコードして
// DataTexture にする。8bit RGBA へ正規化する部分は GL に依存しないのでテストできる。
export function pngToRgba8(png: Pick<DecodedPng, "width" | "height" | "data" | "channels" | "depth" | "palette">): Uint8Array {
  const { width, height, data, channels, depth, palette } = png;
  const out = new Uint8Array(width * height * 4);
  const shift = depth === 16 ? 8 : 0;
  const max = depth === 16 ? 255 : (1 << depth) - 1;
  const to8 = (v: number) => (depth === 16 ? v >> shift : depth === 8 ? v : Math.round((v * 255) / max));
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    const s = i * channels;
    if (palette) {
      const [r, g, b, a] = palette[data[s]] as number[];
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = a ?? 255;
    } else if (channels === 1 || channels === 2) {
      const v = to8(data[s]);
      out[o] = out[o + 1] = out[o + 2] = v;
      out[o + 3] = channels === 2 ? to8(data[s + 1]) : 255;
    } else {
      out[o] = to8(data[s]);
      out[o + 1] = to8(data[s + 1]);
      out[o + 2] = to8(data[s + 2]);
      out[o + 3] = channels === 4 ? to8(data[s + 3]) : 255;
    }
  }
  return out;
}
