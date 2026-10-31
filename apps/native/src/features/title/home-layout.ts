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

export const MAX_COMPANION_SIZE = 300;
export const MIN_COMPANION_SIZE = 160;
// PoopmSprite は幅 size に対して高さ size * 260 / 207。
const SPRITE_HEIGHT_RATIO = 260 / 207;
// 上のタブ2つ + 吹き出し + 余白。実機で重ならない値として置いている。
const TABS_HEIGHT = 112;
const SPEECH_BUBBLE_HEIGHT = 90;
// 泡のラベルのピル（44）から、泡に重ねる分（16）を引いた高さ。
const BUBBLE_LABEL_HEIGHT = 44 - SPACING_LG;
// 小さい泡の列は下揃えなので、ピルの上端は列の下端から 44 上。
const SMALL_PILL_HEIGHT = 44;

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

// 歯車の下に置くガチャの泡。下の小さい泡より一回り小さくして、相棒・吹き出しに被らないようにする。
const GACHA_BUBBLE_RATIO = 0.75;
export function gachaBubbleSize(smallBubbleSize: number) {
  return Math.max(MIN_BUBBLE_SIZE, Math.floor(smallBubbleSize * GACHA_BUBBLE_RATIO));
}

// 吹き出し・相棒・下の泡が縦に重ならないよう、画面の高さに合わせて相棒を小さくする。
export function companionSize(windowHeight: number, largeBubbleSize: number, verticalInsets: number, maxSize = MAX_COMPANION_SIZE) {
  const reserved =
    verticalInsets + SPACING_MD * 2 + TABS_HEIGHT + SPEECH_BUBBLE_HEIGHT + largeBubbleSize + BUBBLE_LABEL_HEIGHT;
  const fitting = Math.floor((windowHeight - reserved) / SPRITE_HEIGHT_RATIO);
  return Math.min(maxSize, Math.max(MIN_COMPANION_SIZE, fitting));
}

// 台座（真っ白で不透明な大きな楕円）。左が高く右へ下がり、ラベルのピルが乗る面になる。
// 座標は「泡の列の上端・画面の左端」を原点にする（padding を挟まず、画面の幅で扱うため）。
const HALO_LEFT_BLEED = 24;
// 左端での縁の高さ。大きい泡の中心〜下を横切らせる。
const HALO_LEFT_EDGE_RATIO = 0.7;
// 楕円の大きさは、縁を通す2点の間隔に対する比。縦を短くすると縁の反りが小さくなる。
const HALO_RX_RATIO = 1;
const HALO_RY_RATIO = 0.6;
// 画面の下へ伸ばす分。画面の外は切れるので、どの端末の下余白でも埋まる大きさにしておく。
const HALO_BOTTOM_EXTENT = 320;
// 吹き出し・相棒の余白（SPACING_MD * 2）の内側に収める上端の余裕。
const HALO_TOP_ROOM = SPACING_MD;

// 縁が通る2点（左: 画面の外、右: 右端の小さい泡の下のピルの上端）から、傾いた楕円を決める。
// 2点を結ぶ弦を水平にした座標で、弦より上に頂点を持つ楕円の中心を求める。
export function haloLayout(windowWidth: number, largeBubbleSize: number) {
  const rowHeight = largeBubbleSize + BUBBLE_LABEL_HEIGHT;
  const left = { x: -HALO_LEFT_BLEED, y: largeBubbleSize * HALO_LEFT_EDGE_RATIO };
  const right = { x: windowWidth - SPACING_LG, y: rowHeight - SMALL_PILL_HEIGHT };
  const chord = Math.hypot(right.x - left.x, right.y - left.y);
  const angle = Math.atan2(right.y - left.y, right.x - left.x);
  const rx = chord * HALO_RX_RATIO;
  const ry = chord * HALO_RY_RATIO;
  const depth = ry * Math.sqrt(1 - (chord / (2 * rx)) ** 2);
  const midX = (left.x + right.x) / 2;
  const midY = (left.y + right.y) / 2;
  return {
    // SVG の箱。上端を HALO_TOP_ROOM だけ泡の列の上に出し、そこで楕円を切る。
    width: windowWidth,
    height: rowHeight + HALO_BOTTOM_EXTENT + HALO_TOP_ROOM,
    left: 0,
    top: -HALO_TOP_ROOM,
    // 箱の中での中心と半径、傾き（度）。
    cx: midX - Math.sin(angle) * depth,
    cy: midY + Math.cos(angle) * depth + HALO_TOP_ROOM,
    rx,
    ry,
    rotation: (angle * 180) / Math.PI,
  };
}
