// 観客の2Dうんちくん。RN には canvas が無いので、ピクセルを直接計算して1枚のアトラス（横に4体）にする。
// 絵柄の違いは見た目だけで、レースの結果には関わらない。
export const CROWD_VARIANTS = 4;
export const SPRITE_CELL = 96;

type Rgb = readonly [number, number, number];

interface Shape {
  /** 0〜1 の画素の被り具合。u は左→右、v は下→上（どちらも 0〜1） */
  coverage: (u: number, v: number) => number;
  color: Rgb;
}

interface Look {
  body: Rgb;
  shade: Rgb;
  accessory: "none" | "hat" | "sunglasses" | "cheer";
  isMouthOpen: boolean;
}

const OUTLINE: Rgb = [0x4a, 0x2c, 0x1a];
const WHITE: Rgb = [255, 255, 255];
const INK: Rgb = [0x2b, 0x1a, 0x10];
const LOOKS: readonly Look[] = [
  { body: [0x9b, 0x65, 0x3a], shade: [0x7e, 0x4d, 0x2a], accessory: "none", isMouthOpen: false },
  { body: [0xc4, 0x8a, 0x56], shade: [0xa8, 0x70, 0x42], accessory: "hat", isMouthOpen: false },
  { body: [0x6e, 0x45, 0x28], shade: [0x58, 0x35, 0x1d], accessory: "sunglasses", isMouthOpen: false },
  { body: [0xe0, 0xa8, 0x3c], shade: [0xc4, 0x8f, 0x2a], accessory: "cheer", isMouthOpen: true },
];

/** 縁が1画素ぶんなだらかに消える被り具合。distance は縁からの距離（画素、内側が負） */
const edge = (distance: number) => Math.min(1, Math.max(0, 0.5 - distance));

function ellipse(cx: number, cy: number, rx: number, ry: number, grow = 0): Shape["coverage"] {
  return (u, v) => {
    const dx = (u - cx) / (rx + grow);
    const dy = (v - cy) / (ry + grow);
    // 正規化した距離を画素に直す（半径の平均で近似）
    return edge((Math.hypot(dx, dy) - 1) * ((rx + ry) / 2) * SPRITE_CELL);
  };
}

function triangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): Shape["coverage"] {
  const sign = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  return (u, v) => {
    const d1 = sign(u, v, ax, ay, bx, by);
    const d2 = sign(u, v, bx, by, cx, cy);
    const d3 = sign(u, v, cx, cy, ax, ay);
    const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
    return hasNegative && hasPositive ? 0 : 1;
  };
}

/** 3段に積んだ体＋てっぺんの先。輪郭は一回り大きい同じ形を先に塗る */
function bodyShapes(look: Look): Shape[] {
  const tiers: [number, number, number, number, Rgb][] = [
    [0.5, 0.2, 0.4, 0.17, look.shade],
    [0.5, 0.42, 0.31, 0.15, look.body],
    [0.5, 0.6, 0.21, 0.13, look.body],
  ];
  const outline = tiers.map(([cx, cy, rx, ry]) => ({ coverage: ellipse(cx, cy, rx, ry, 0.022), color: OUTLINE }));
  const fill = tiers.map(([cx, cy, rx, ry, color]) => ({ coverage: ellipse(cx, cy, rx, ry), color }));
  const tip = { coverage: triangle(0.44, 0.7, 0.58, 0.7, 0.52, 0.88), color: look.body };
  const tipOutline = { coverage: triangle(0.41, 0.69, 0.61, 0.69, 0.52, 0.91), color: OUTLINE };
  return [tipOutline, ...outline, tip, ...fill];
}

function faceShapes(look: Look): Shape[] {
  const eyeY = 0.43;
  const shapes: Shape[] = [];
  if (look.accessory === "sunglasses") {
    shapes.push({ coverage: ellipse(0.4, eyeY, 0.085, 0.06), color: INK }, { coverage: ellipse(0.6, eyeY, 0.085, 0.06), color: INK });
    shapes.push({ coverage: (u, v) => (Math.abs(v - eyeY - 0.02) < 0.012 && u > 0.4 && u < 0.6 ? 1 : 0), color: INK });
  } else {
    for (const cx of [0.4, 0.6]) {
      shapes.push({ coverage: ellipse(cx, eyeY, 0.05, 0.06), color: WHITE }, { coverage: ellipse(cx, eyeY - 0.005, 0.026, 0.035), color: INK });
    }
  }
  shapes.push(
    look.isMouthOpen
      ? { coverage: ellipse(0.5, 0.31, 0.07, 0.055), color: INK }
      : { coverage: (u, v) => edge(Math.abs(Math.hypot(u - 0.5, v - 0.35) - 0.07) * SPRITE_CELL - 1) * (v < 0.345 ? 1 : 0), color: INK },
  );
  return shapes;
}

function accessoryShapes(look: Look): Shape[] {
  if (look.accessory === "hat") {
    return [
      { coverage: triangle(0.3, 0.7, 0.7, 0.7, 0.5, 0.98), color: [0xff, 0x7a, 0xac] },
      { coverage: ellipse(0.5, 0.985, 0.045, 0.03), color: WHITE },
    ];
  }
  if (look.accessory === "cheer") {
    // 両腕を上げて応援している
    return [
      { coverage: ellipse(0.1, 0.62, 0.065, 0.12, 0.02), color: OUTLINE },
      { coverage: ellipse(0.9, 0.62, 0.065, 0.12, 0.02), color: OUTLINE },
      { coverage: ellipse(0.1, 0.62, 0.065, 0.12), color: look.body },
      { coverage: ellipse(0.9, 0.62, 0.065, 0.12), color: look.body },
    ];
  }
  return [];
}

function shapesFor(variant: number): Shape[] {
  const look = LOOKS[variant];
  // 腕は体の後ろに回す
  const behind = look.accessory === "cheer" ? accessoryShapes(look) : [];
  const front = look.accessory === "cheer" ? [] : accessoryShapes(look);
  return [...behind, ...bodyShapes(look), ...faceShapes(look), ...front];
}

export interface SpriteAtlas {
  pixels: Uint8Array;
  width: number;
  height: number;
}

/** 4体を横に並べたアトラス（RGBA、上下は DataTexture の向き＝下の行が先） */
export function renderCrowdAtlas(): SpriteAtlas {
  const width = SPRITE_CELL * CROWD_VARIANTS;
  const height = SPRITE_CELL;
  const pixels = new Uint8Array(width * height * 4);
  for (let variant = 0; variant < CROWD_VARIANTS; variant++) {
    const shapes = shapesFor(variant);
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < SPRITE_CELL; column++) {
        const u = (column + 0.5) / SPRITE_CELL;
        const v = (row + 0.5) / SPRITE_CELL;
        let alpha = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        for (const shape of shapes) {
          const a = shape.coverage(u, v);
          if (a <= 0) continue;
          // 後から塗る形を上に重ねる。色は被り分だけ置き換え、不透明度は足していく
          r = r * (1 - a) + shape.color[0] * a;
          g = g * (1 - a) + shape.color[1] * a;
          b = b * (1 - a) + shape.color[2] * a;
          alpha = alpha + a * (1 - alpha);
        }
        pixels.set([Math.round(r), Math.round(g), Math.round(b), Math.round(alpha * 255)], (row * width + variant * SPRITE_CELL + column) * 4);
      }
    }
  }
  return { pixels, width, height };
}
