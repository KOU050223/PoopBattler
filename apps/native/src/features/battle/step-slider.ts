/** トラック上のx座標（0〜width）を、等間隔に並んだ options のインデックスへ丸める。 */
export function stepIndexFromPosition(x: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, x / width));
  return Math.round(ratio * (count - 1));
}

/** インデックスに対応するつまみの中心位置（0〜1）。 */
export function stepRatio(index: number, count: number): number {
  return count <= 1 ? 0 : index / (count - 1);
}

/** ドラッグ中のつまみ位置（0〜1）。段階にスナップせず指に追従させる。 */
export function ratioFromPosition(x: number, width: number): number {
  if (width <= 0) return 0;
  return Math.min(1, Math.max(0, x / width));
}
