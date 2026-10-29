// テストで react-native を読み込まないよう、spacing は値を写して持つ（lg=16, md=12）。
const SPACING_LG = 16;
const SPACING_MD = 12;

// 390dp 以上の画面での大きさ（画面案の値）。
export const LARGE_BUBBLE_SIZE = 152;
export const SMALL_BUBBLE_SIZE = 104;
const FULL_SIZE_MIN_WIDTH = 390;
const MIN_BUBBLE_SIZE = 44;
const SMALL_BUBBLE_COUNT = 2;
const SCREEN_PADDING = SPACING_LG * 2;
const BUBBLE_GAP = SPACING_MD;

export const MAX_COMPANION_SIZE = 240;
export const MIN_COMPANION_SIZE = 160;
// PoopmSprite は幅 size に対して高さ size * 260 / 207。
const SPRITE_HEIGHT_RATIO = 260 / 207;
// 上のタブ2つ + 吹き出し + 余白。実機で重ならない値として置いている。
const TABS_HEIGHT = 112;
const SPEECH_BUBBLE_HEIGHT = 90;
// 泡のラベルのピル（44）から、泡に重ねる分（16）を引いた高さ。
const BUBBLE_LABEL_HEIGHT = 44 - SPACING_LG;

// 下の泡3つ（大・小・小）が横幅に収まるよう、幅に応じて縮める。広い画面では元の大きさのまま。
export function bubbleSizes(windowWidth: number) {
  const fullWidth = LARGE_BUBBLE_SIZE + SMALL_BUBBLE_SIZE * SMALL_BUBBLE_COUNT;
  const available = windowWidth - SCREEN_PADDING - BUBBLE_GAP;
  // 390dp は画面案の値をそのまま使う（余白が少し詰まるだけで、はみ出さない）。
  const scale = windowWidth >= FULL_SIZE_MIN_WIDTH ? 1 : Math.min(1, available / fullWidth);
  return {
    large: Math.max(MIN_BUBBLE_SIZE, Math.floor(LARGE_BUBBLE_SIZE * scale)),
    small: Math.max(MIN_BUBBLE_SIZE, Math.floor(SMALL_BUBBLE_SIZE * scale)),
  };
}

// 吹き出し・相棒・下の泡が縦に重ならないよう、画面の高さに合わせて相棒を小さくする。
export function companionSize(windowHeight: number, largeBubbleSize: number, verticalInsets: number) {
  const reserved =
    verticalInsets + SPACING_MD * 2 + TABS_HEIGHT + SPEECH_BUBBLE_HEIGHT + largeBubbleSize + BUBBLE_LABEL_HEIGHT;
  const fitting = Math.floor((windowHeight - reserved) / SPRITE_HEIGHT_RATIO);
  return Math.min(MAX_COMPANION_SIZE, Math.max(MIN_COMPANION_SIZE, fitting));
}

// 光の台座。画面の左右にはみ出させて端で切る（画面案: 「ここが舞台」の感じを強くする）。
const HALO_BLEED = 24;
// 泡の上に出す量。吹き出し・相棒の余白（SPACING_MD * 2）の内側に収める。
const HALO_TOP_OVERHANG = SPACING_MD;
// 泡の列の下端より下に伸ばす量。中心が泡の列より少し下になる。
const HALO_BOTTOM_OVERHANG = SPACING_LG + SPACING_MD;

// 泡の列（大きい泡 + ラベル）を基準に、列の左上を原点とした位置と大きさを返す。
// 画面の親（paddingHorizontal 付き）を基準にするため、left は padding 分を引いて渡す。
export function haloLayout(windowWidth: number, largeBubbleSize: number) {
  const rowHeight = largeBubbleSize + BUBBLE_LABEL_HEIGHT;
  return {
    width: windowWidth + HALO_BLEED * 2,
    height: rowHeight + HALO_TOP_OVERHANG + HALO_BOTTOM_OVERHANG,
    left: -(HALO_BLEED + SCREEN_PADDING / 2),
    top: -HALO_TOP_OVERHANG,
  };
}
