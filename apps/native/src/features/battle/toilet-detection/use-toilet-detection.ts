import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  Camera,
  runAsync,
  runAtTargetFps,
  useCameraPermission,
  useFrameProcessor,
  type CameraPermissionStatus,
  type ReadonlyFrameProcessor,
} from "react-native-vision-camera";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { useRunOnJS, useSharedValue } from "react-native-worklets-core";

import {
  overlayBoxFromDetection,
  pickToiletDetection,
  toiletSightFromDetection,
  TOILET_DEBUG_SCORE,
  TOILET_INFER_INTERVAL_MS,
  type ToiletModelStatus,
  type ToiletSight,
} from "@poopbattler/domain/battle/toilet-detection";

import { TOILET_DETECTOR_MODEL } from "./ssd-model";
import {
  cocoDetectionsFromRaw,
  uprightFrameSize,
  SSD_INPUT_SIZE,
  SSD_MAX_DETECTIONS,
  type FrameOrientation,
  type RawSsdDetection,
} from "./ssd-detections";

export type ToiletCameraPermission = "undetermined" | "granted" | "denied";

export type UseToiletDetectionOptions = {
  /** false の間は推論を止め、sight を none に戻す。 */
  enabled: boolean;
  /** プレビュー表示枠（dp）。resizeMode="cover" の Camera ビューのレイアウトサイズを渡す。 */
  previewWidth: number;
  previewHeight: number;
};

export type UseToiletDetectionResult = {
  /** モデルの状態。domain の ToiletModelStatus に揃えている。 */
  status: ToiletModelStatus;
  sight: ToiletSight;
  cameraPermission: ToiletCameraPermission;
  /** true を返せば許可された。拒否時は設定アプリからの変更が必要。 */
  requestCameraPermission: () => Promise<boolean>;
  /** <Camera frameProcessor={..}> に渡す。モデル未ロード・disabled・未許可の間は何もしない。 */
  frameProcessor: ReadonlyFrameProcessor;
};

function toUiPermission(status: CameraPermissionStatus): ToiletCameraPermission {
  if (status === "granted") return "granted";
  if (status === "not-determined") return "undetermined";
  return "denied"; // denied / restricted はどちらもリクエストで許可できない
}

/**
 * web 版 use-toilet-detection の native 移植。
 * vision-camera frame processor 上で resize plugin → fast-tflite の SSD を回し、
 * 検出→座標マッピング→hit/low/none 判定は domain の関数をそのまま使う。
 */
export function useToiletDetection(options: UseToiletDetectionOptions): UseToiletDetectionResult {
  const { enabled, previewWidth, previewHeight } = options;
  const [sight, setSight] = useState<ToiletSight>({ kind: "none" });

  const { hasPermission, requestPermission } = useCameraPermission();
  // hasPermission だけだと「未要求」と「拒否」を区別できないので raw status も追う。
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>(() =>
    Camera.getCameraPermissionStatus(),
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", () => {
      setPermissionStatus(Camera.getCameraPermissionStatus());
    });
    return () => sub.remove();
  }, []);
  const requestCameraPermission = useCallback(async () => {
    const granted = await requestPermission();
    setPermissionStatus(Camera.getCameraPermissionStatus());
    return granted;
  }, [requestPermission]);
  const cameraPermission = hasPermission ? "granted" : toUiPermission(permissionStatus);

  const plugin = useTensorflowModel(TOILET_DETECTOR_MODEL);
  const model = plugin.state === "loaded" ? plugin.model : undefined;
  const status: ToiletModelStatus =
    plugin.state === "loaded" ? "ready" : plugin.state === "error" ? "failed" : enabled ? "loading" : "idle";

  const { resize } = useResizePlugin();
  const active = useSharedValue(false);
  useEffect(() => {
    active.value = enabled && hasPermission;
  }, [active, enabled, hasPermission]);
  useEffect(() => {
    if (!enabled) setSight({ kind: "none" });
  }, [enabled]);

  // worklet から JS へ検出結果を運ぶ経路。座標マッピングと pick はこちらで行う。
  const handleDetections = useCallback(
    (raws: RawSsdDetection[], frameWidth: number, frameHeight: number, orientation: FrameOrientation) => {
      const upright = uprightFrameSize(frameWidth, frameHeight, orientation);
      const detections = cocoDetectionsFromRaw(raws, upright.width, upright.height);
      const picked = pickToiletDetection(detections);
      const box = picked
        ? overlayBoxFromDetection(picked, upright.width, upright.height, previewWidth, previewHeight)
        : null;
      setSight(toiletSightFromDetection(picked, box, previewWidth, previewHeight));
    },
    [previewWidth, previewHeight],
  );
  const emitDetections = useRunOnJS(handleDetections, [handleDetections]);

  const targetFps = 1000 / TOILET_INFER_INTERVAL_MS;

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (model == null || !active.value) return;
      runAtTargetFps(targetFps, () => {
        "worklet";
        runAsync(frame, () => {
          "worklet";
          // センサー向きのままだと bbox と表示が90°ずれるので、正立に戻してから
          // 推論する（iOS 背面カメラは 'landscape-left' → '90deg' で正立）。
          const orientation = frame.orientation;
          const rotation =
            orientation === "landscape-left"
              ? "90deg"
              : orientation === "landscape-right"
                ? "270deg"
                : orientation === "portrait-upside-down"
                  ? "180deg"
                  : "0deg";
          // crop を省略すると正方形へセンタークロップされて座標対応が崩れるので、
          // フレーム全体を明示してスカッシュする（web 版の video 全体リサイズ相当）。
          const resized = resize(frame, {
            scale: { width: SSD_INPUT_SIZE, height: SSD_INPUT_SIZE },
            crop: { x: 0, y: 0, width: frame.width, height: frame.height },
            rotation,
            pixelFormat: "rgb",
            dataType: "uint8",
          });
          const outputs = model.runSync([resized]);
          const locations = outputs[0];
          const classes = outputs[1];
          const scores = outputs[2];
          const numDetections = outputs[3];
          const count = Math.min(Number(numDetections[0]), SSD_MAX_DETECTIONS);
          const raws: RawSsdDetection[] = [];
          for (let i = 0; i < count; i++) {
            const score = Number(scores[i]);
            if (score < TOILET_DEBUG_SCORE) continue;
            raws.push({
              box: [
                Number(locations[i * 4]),
                Number(locations[i * 4 + 1]),
                Number(locations[i * 4 + 2]),
                Number(locations[i * 4 + 3]),
              ],
              classIndex: Math.round(Number(classes[i])),
              score,
            });
          }
          emitDetections(raws, frame.width, frame.height, orientation);
        });
      });
    },
    [model, resize, emitDetections, active, targetFps],
  );

  return { status, sight, cameraPermission, requestCameraPermission, frameProcessor };
}
