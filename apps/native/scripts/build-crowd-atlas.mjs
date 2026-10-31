// 観客うんちくんのアトラス（assets/race/crowd-atlas.png）を、パーツ画像（apps/web/public/assets/poopm_parts）から作る。
// 見た目を変えたら `node apps/native/scripts/build-crowd-atlas.mjs` を実行し、できた PNG をコミットする。
// sharp は apps/web（Next）の依存として入っているものを使う。
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const parts = path.resolve(root, "../web/public/assets/poopm_parts");
const output = path.resolve(root, "assets/race/crowd-atlas.png");

/** 観客4体の組み合わせ。体の色・帽子・目・口をそれぞれ変えて、遠目にも別の子に見えるようにする */
const LOOKS = [
  { body: "a", hat: "none", eyes: "a", mouth: "a" },
  { body: "pink", hat: "c", eyes: "c", mouth: "b" },
  { body: "charcoal", hat: "e", eyes: "d", mouth: "f" },
  { body: "yellow", hat: "f", eyes: "b", mouth: "c" },
];

/** 1区画（正方形）。キャラは高さいっぱい・横は中央に置く（板は正方形、足元が下の辺に付く） */
const CELL = 128;
/** poopm-sprite.tsx と同じ配置（body 207x220 を基準にした割合）。キャラ全体は 207x260 */
const SPRITE = { width: 207, height: 260 };
const LAYOUT = {
  body: { left: 9, top: 12, width: 82, ratio: 207 / 220 },
  hat: { left: 31, top: 0, width: 38, ratio: 108 / 80 },
  mouth: { left: 35, top: 68, width: 30, ratio: 80 / 60 },
  eyes: { left: 29, top: 39, width: 42, ratio: 128 / 87 },
};
const SCALE = CELL / SPRITE.height;

async function layer(file, { left, top, width, ratio }) {
  const boxWidth = Math.round(((SPRITE.width * width) / 100) * SCALE);
  const boxHeight = Math.round((((SPRITE.width * width) / 100) / ratio) * SCALE);
  const input = await sharp(file)
    .resize(boxWidth, boxHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return {
    input,
    left: Math.round(((SPRITE.width * left) / 100) * SCALE),
    top: Math.round(((SPRITE.height * top) / 100) * SCALE),
  };
}

async function renderCell(look) {
  // 重ね順は poopm-sprite.tsx と同じ（体 → 帽子 → 口 → 目）
  const layers = [
    await layer(path.join(parts, `body/poopm_body_${look.body}.png`), LAYOUT.body),
    await layer(path.join(parts, `hat/poopm_hat_${look.hat}.png`), LAYOUT.hat),
    await layer(path.join(parts, `mouth/poopm_mouth_${look.mouth}.png`), LAYOUT.mouth),
    await layer(path.join(parts, `eyes/poopm_eye_${look.eyes}.png`), LAYOUT.eyes),
  ];
  const characterWidth = Math.round(SPRITE.width * SCALE);
  const character = await sharp({ create: { width: characterWidth, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toBuffer();
  return { input: character, left: Math.round((CELL - characterWidth) / 2), top: 0 };
}

const cells = await Promise.all(LOOKS.map(renderCell));
await sharp({ create: { width: CELL * LOOKS.length, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(cells.map((cell, index) => ({ ...cell, left: cell.left + index * CELL })))
  .png({ compressionLevel: 9 })
  .toFile(output);
console.log(`wrote ${path.relative(process.cwd(), output)} (${CELL * LOOKS.length}x${CELL})`);
