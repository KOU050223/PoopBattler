// PoopmSprite は幅 size に対して高さ size * 260 / 207（本体は 220 までで、残りが足元）。
const SPRITE_HEIGHT_RATIO = 260 / 207;
// 地面の中心を置く高さ。スプライトの上端から見た比で、本体の下端（220/260）より少し下の足裏あたり。
const FEET_Y_RATIO = 0.93;
const GROUND_WIDTH_RATIO = 1.5;
const GROUND_HEIGHT_RATIO = 0.3;

// ホームの背景絵にある「立つ位置の淡い楕円」の代わり。レースの背景は絵に地面がないので、足元へ描き足す。
export function raceGroundLayout(companionSize: number) {
  const spriteHeight = companionSize * SPRITE_HEIGHT_RATIO;
  const width = Math.round(companionSize * GROUND_WIDTH_RATIO);
  const height = Math.round(companionSize * GROUND_HEIGHT_RATIO);
  return {
    width,
    height,
    // 親（相棒の箱）の左上を原点にした、楕円の箱の位置。横は中央揃え。
    left: Math.round((companionSize - width) / 2),
    top: Math.round(spriteHeight * FEET_Y_RATIO - height / 2),
  };
}
