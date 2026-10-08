import type { CocoDetection } from "@poopbattler/domain/battle/toilet-detection";

export const SSD_INPUT_SIZE = 300;
export const SSD_MAX_DETECTIONS = 10;

// モデル同梱の labelmap.txt そのまま（91行）。classes 出力値 = この配列の index。
// COCO category_id と同じ並びで、使われない id は "???"。toilet は index 70。
export const SSD_LABELS: readonly string[] = [
  "???",
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "???",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "???",
  "backpack",
  "umbrella",
  "???",
  "???",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "bottle",
  "???",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "???",
  "dining table",
  "???",
  "???",
  "toilet",
  "???",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "???",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
];

// vision-camera Frame.orientation と同じ値。frame のバッファが
// 出力向き（portrait）に対してどれだけ回転しているかを表す。
export type FrameOrientation = "portrait" | "landscape-left" | "landscape-right" | "portrait-upside-down";

// resize plugin の rotation オプション（時計回り）。
export type UprightRotation = "0deg" | "90deg" | "180deg" | "270deg";

// frame processor から JS スレッドへ渡す生の検出結果。
// box はモデル入力（= 正立・フレーム全画素を 300x300 にスカッシュした座標系）での
// 0-1 正規化 [ymin,xmin,ymax,xmax]。
export type RawSsdDetection = {
  box: readonly [number, number, number, number];
  classIndex: number;
  score: number;
};

/**
 * frame.orientation を正立に戻す回転を返す。
 * vision-camera の RotationHelper.uiRotation と同じ定義（landscape-left=270°
 * の差分を +90° CW に丸める）。実機未検証なのでズレたらこの対応表を直す。
 */
export function uprightRotationForOrientation(orientation: FrameOrientation): UprightRotation {
  switch (orientation) {
    case "landscape-left":
      return "90deg";
    case "landscape-right":
      return "270deg";
    case "portrait-upside-down":
      return "180deg";
    case "portrait":
      return "0deg";
  }
}

/** 正立させたあとのフレーム画素サイズ。landscape 系は縦横が入れ替わる。 */
export function uprightFrameSize(
  frameWidth: number,
  frameHeight: number,
  orientation: FrameOrientation,
): { width: number; height: number } {
  if (orientation === "landscape-left" || orientation === "landscape-right") {
    return { width: frameHeight, height: frameWidth };
  }
  return { width: frameWidth, height: frameHeight };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * 正規化 box を正立フレーム画素座標の CocoDetection に変換する。
 * bbox は [x, y, width, height]。web 版と同じく domain の
 * overlayBoxFromDetection / pickToiletDetection にそのまま渡せる形。
 */
export function cocoDetectionFromRaw(
  raw: RawSsdDetection,
  frameWidth: number,
  frameHeight: number,
): CocoDetection | null {
  if (frameWidth <= 0 || frameHeight <= 0) return null;
  const label = SSD_LABELS[raw.classIndex];
  if (label == null) return null;
  const [ymin, xmin, ymax, xmax] = raw.box;
  const x0 = clamp01(xmin) * frameWidth;
  const y0 = clamp01(ymin) * frameHeight;
  const x1 = clamp01(xmax) * frameWidth;
  const y1 = clamp01(ymax) * frameHeight;
  if (x1 <= x0 || y1 <= y0) return null;
  return {
    bbox: [x0, y0, x1 - x0, y1 - y0],
    class: label,
    score: raw.score,
  };
}

export function cocoDetectionsFromRaw(
  raws: readonly RawSsdDetection[],
  frameWidth: number,
  frameHeight: number,
): CocoDetection[] {
  const out: CocoDetection[] = [];
  for (const raw of raws) {
    const detection = cocoDetectionFromRaw(raw, frameWidth, frameHeight);
    if (detection) out.push(detection);
  }
  return out;
}
