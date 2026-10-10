// T-009a 検証用。画面からは参照しない（export / prebuild で配線とアセット解決を確認する用）。
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";

import { toiletDebugCopy } from "@poopbattler/domain/battle/toilet-detection";

import { colors, fonts, spacing } from "../../../../theme";
import { useToiletDetection } from "../use-toilet-detection";

export function ToiletDetectProbe() {
  const device = useCameraDevice("back");
  const [preview, setPreview] = useState({ width: 0, height: 0 });
  const { status, sight, cameraPermission, requestCameraPermission, frameProcessor } =
    useToiletDetection({
      enabled: true,
      previewWidth: preview.width,
      previewHeight: preview.height,
    });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPreview({ width, height });
  };

  const copy = toiletDebugCopy(status, sight);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {cameraPermission === "granted" && device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          resizeMode="cover"
          frameProcessor={frameProcessor}
        />
      ) : null}

      {sight.kind !== "none" ? (
        <View
          pointerEvents="none"
          style={[
            styles.box,
            sight.kind === "low" && styles.boxLow,
            {
              left: sight.box.x,
              top: sight.box.y,
              width: sight.box.width,
              height: sight.box.height,
            },
          ]}
        />
      ) : null}

      {copy ? (
        <View pointerEvents="none" style={styles.hud}>
          <Text style={styles.hudText}>{copy}</Text>
        </View>
      ) : null}

      {cameraPermission !== "granted" ? (
        <View style={styles.permission}>
          <Text style={styles.permissionText}>
            {cameraPermission === "denied"
              ? "カメラの使用が許可されていません。設定アプリから許可してください。"
              : "便器検出のためにカメラの許可が必要です。"}
          </Text>
          {cameraPermission === "undetermined" ? (
            <Pressable style={styles.permissionButton} onPress={() => void requestCameraPermission()}>
              <Text style={styles.permissionButtonText}>カメラを許可する</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.permissionButton} onPress={() => void Linking.openSettings()}>
              <Text style={styles.permissionButtonText}>設定アプリを開く</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.nightInk,
  },
  box: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.flushPink,
    borderRadius: 8,
  },
  boxLow: {
    borderColor: colors.cottonPink,
    borderStyle: "dashed",
  },
  hud: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    alignItems: "center",
  },
  hudText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.paperWhite,
    backgroundColor: "rgba(0,4,55,0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    overflow: "hidden",
    textAlign: "center",
  },
  permission: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  permissionText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.paperWhite,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: colors.flushPink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  permissionButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.paperWhite,
  },
});
