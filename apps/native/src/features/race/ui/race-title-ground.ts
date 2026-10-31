// PoopmSprite は幅 size に対して高さ size * 260 / 207（本体は 220 までで、残りが足元）。
const SPRITE_HEIGHT_RATIO = 260 / 207;
// 足裏の高さ。スプライトの上端から見た比で、本体の下端（220/260）より少し下。
const FEET_Y_RATIO = 0.93;
// 楕円の頂点は足裏よりだいぶ奥（上）に置く。足の下の影は横に広く奥へも伸びるので、浅いと影が地面の外（背景の上）にはみ出して浮いて見える。
const APEX_ABOVE_FEET_RATIO = 0.3;
// 画面の幅に対する楕円の幅。左右が画面の外へ出て、端ではゆるやかに縁が下がる。
const GROUND_WIDTH_SCREEN_RATIO = 2.4;
// 横の半径に対する縦の半径。ホームの台座（HALO_RY_RATIO）と同じ 0.6 で、浅い弧にする。
const GROUND_RY_RX_RATIO = 0.6;

// 相棒が立つ地面。ホームの台座と同じく、不透明で画面より大きい楕円を足元から下へ広げ、左右と下は画面の外で見切れさせる。
export function raceGroundLayout(companionSize: number, windowWidth: number) {
  const spriteHeight = companionSize * SPRITE_HEIGHT_RATIO;
  const width = Math.round(windowWidth * GROUND_WIDTH_SCREEN_RATIO);
  const height = Math.round(width * GROUND_RY_RX_RATIO);
  return {
    width,
    height,
    // 親（相棒の箱）の左上を原点にした、楕円の箱の位置。横は相棒の中心に揃える。
    left: Math.round((companionSize - width) / 2),
    top: Math.round(spriteHeight * FEET_Y_RATIO - companionSize * APEX_ABOVE_FEET_RATIO),
  };
}
