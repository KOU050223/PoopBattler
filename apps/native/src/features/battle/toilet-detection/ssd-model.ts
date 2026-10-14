// COCO SSD MobileNet V1（uint8 量子化、300x300 入力）。
// 取得元: https://storage.googleapis.com/download.tensorflow.org/models/tflite/coco_ssd_mobilenet_v1_1.0_quant_2018_06_29.zip
//   （TensorFlow 公式の TFLite サンプル配布物。Apache-2.0。web 版 coco-ssd と同系統の SSD 検出モデル）
// 入力: [1,300,300,3] uint8 RGB
// 出力（この順）:
//   [0] locations       [1,10,4] float32: [ymin,xmin,ymax,xmax] 0-1 正規化
//   [1] classes         [1,10]   float32: SSD_LABELS の index を浮動小数で保持
//   [2] scores          [1,10]   float32
//   [3] num_detections  [1]      float32
// Metro は require の静的パスしか解決できないため、アセットはこの1ファイルで require する。
export const TOILET_DETECTOR_MODEL: number = require("../../../../assets/models/ssd_mobilenet_v1_coco_quant.tflite");
