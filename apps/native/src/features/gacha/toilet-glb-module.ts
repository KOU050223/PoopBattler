// Metro は require の静的パスしか解決できない。
// 元の GLB は 11.7MB（4K 級の法線マップ込み）だったため、法線マップを外しテクスチャを 1024px に縮めて持つ。
export const TOILET_GLB_MODULE: number = require("../../../assets/gacha/toilet.glb");
