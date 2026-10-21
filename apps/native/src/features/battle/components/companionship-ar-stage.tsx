import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Camera, useCameraDevice } from "react-native-vision-camera";

import {
  COMPANIONSHIP_PHASE_MS,
  REVEAL_MODEL_BOX_PX,
  VIDEO_SHAKE_ANIMATE,
  VIDEO_SHAKE_TRANSITION,
  canStartGachaBySwipe,
  clampRevealScale,
  clampRevealSpawn,
  companionshipPhaseDelay,
  companionshipRevealCopy,
  gachaCameraStatusMessage,
  gachaRevealScale,
  isLiveCameraOverlay,
  nextCompanionshipArPhase,
  resolveRevealTarget,
  shouldCrawlOut,
  shouldPlayThrow,
  type CompanionshipArPhase,
} from "@poopbattler/domain/battle/companionship-ar";
import {
  DEFAULT_THROW_TARGET,
  resolveThrowTarget,
  toiletDebugCopy,
  type PercentPoint,
  type ToiletModelStatus,
  type ToiletSight,
} from "@poopbattler/domain/battle/toilet-detection";
import type { UserMediaCameraStatus } from "@poopbattler/domain/ports";

import { photoStore } from "@/adapters/expo-photo-fs";
import { colors, fontSize, fonts, radius, spacing } from "@/theme";

import { Poopm3DGacha } from "../../poopm-3d/components/poopm-3d-gacha";
import { poopm3DBaseGlb, poopm3DHeadVarGlb } from "../../poopm-3d/poopm-3d-assets";
import { loadGlb } from "../../poopm-3d/poopm-3d-glb-loader";
import { useReduceMotion } from "../../poopm-3d/use-reduce-motion";
import { gachaCameraStatus, resolveStageTouch } from "../companionship-ar";
import { appearanceForCharacter } from "../poopm-appearance";
import type { CompleteBattleResult } from "../supabase-gateway";
import { useToiletDetection } from "../toilet-detection/use-toilet-detection";
import { useGravityFloor } from "../use-gravity-floor";
import { Button } from "./ui";

type Completed = Extract<CompleteBattleResult, { success: true }>;

// 前傾でモデルがカメラ側へ倒れると、直立でぴったりの箱から出てキャンバス端で
// 切れる。箱の周囲に余白を取って描画する（web の REVEAL_CANVAS_OVERSCAN と同値）。
const REVEAL_CANVAS_OVERSCAN = 1.8;

// 投げ入れ写真の表示サイズ。web の h-28 w-28（112px）相当。
const THROW_PHOTO_SIZE = 112;

const CONFETTI_PIECES = [
  { x: 10, delay: 0, color: "#ff7aac", w: 8, h: 12, rot: 22 },
  { x: 22, delay: 0.04, color: "#1cb0f6", w: 7, h: 11, rot: -16 },
  { x: 34, delay: 0.08, color: "#ffb3d0", w: 9, h: 10, rot: 8 },
  { x: 46, delay: 0.02, color: "#ffffff", w: 6, h: 12, rot: -28 },
  { x: 58, delay: 0.1, color: "#ff7aac", w: 8, h: 9, rot: 14 },
  { x: 70, delay: 0.06, color: "#1cb0f6", w: 7, h: 13, rot: -10 },
  { x: 82, delay: 0.12, color: "#ffb3d0", w: 8, h: 11, rot: 26 },
  { x: 16, delay: 0.16, color: "#ffffff", w: 6, h: 10, rot: -6 },
  { x: 40, delay: 0.18, color: "#ff7aac", w: 9, h: 8, rot: 18 },
  { x: 64, delay: 0.14, color: "#1cb0f6", w: 7, h: 12, rot: -22 },
  { x: 88, delay: 0.2, color: "#c94d7f", w: 8, h: 10, rot: 12 },
  { x: 28, delay: 0.22, color: "#ffffff", w: 6, h: 11, rot: -14 },
] as const;

function phaseLabel(
  t: (key: string) => string,
  phase: CompanionshipArPhase,
  canSwipe: boolean,
): string {
  if (phase === "throw") return t("Battle.gachaThrowing");
  if (phase === "shake") return t("Battle.gachaShaking");
  if (phase === "reveal") return t("Battle.gachaRevealTap");
  return canSwipe ? t("Battle.gachaGuideSwipe") : t("Battle.gachaGuideWait");
}

function RevealConfetti({ stageHeight, reduceMotion }: { stageHeight: number; reduceMotion: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {CONFETTI_PIECES.map((piece, index) => (
        <ConfettiPiece
          key={index}
          piece={piece}
          stageHeight={stageHeight}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

function ConfettiPiece({
  piece,
  stageHeight,
  reduceMotion,
}: {
  piece: (typeof CONFETTI_PIECES)[number];
  stageHeight: number;
  reduceMotion: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 1150,
      delay: piece.delay * 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [piece.delay, progress, reduceMotion]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, stageHeight * 1.3],
  });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [`${piece.rot}deg`, `${piece.rot + 120}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left: `${piece.x}%`,
          width: piece.w,
          height: piece.h,
          backgroundColor: piece.color,
          opacity,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    />
  );
}

function ToiletDebugOverlay({ sight }: { sight: ToiletSight }) {
  if (sight.kind === "none") return null;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.sightBox,
        sight.kind === "low" && styles.sightBoxLow,
        {
          left: sight.box.x,
          top: sight.box.y,
          width: sight.box.width,
          height: sight.box.height,
        },
      ]}
    />
  );
}

// web の useMealPhotoUrl 相当。ファイルが実在するときだけ表示URIを返す
// （投げ入れ中に壊れた画像を出さないため）。
function useMealPhotoUri(photoId: string | null) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId) return;
    let alive = true;
    void photoStore
      .get(photoId)
      .then((bytes) => {
        if (alive && bytes) setUri(photoStore.uriFor(photoId));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [photoId]);

  return photoId ? uri : null;
}

export function CompanionshipArStage({
  result,
  mealPhotoId,
  onDone,
}: {
  result: Completed;
  mealPhotoId: string | null;
  /** summary 相当。呼ぶと親が通常の結果画面へ切り替える。 */
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const device = useCameraDevice("back");
  const { up: gravityUp } = useGravityFloor();
  const mealPhotoUri = useMealPhotoUri(mealPhotoId);

  const [phase, setPhase] = useState<CompanionshipArPhase>("staging");
  const [aimPoint, setAimPoint] = useState<PercentPoint | null>(null);
  const [heldTarget, setHeldTarget] = useState<PercentPoint>(DEFAULT_THROW_TARGET);
  const [heldScale, setHeldScale] = useState(1);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const stageRef = useRef<View>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const hasPhoto = shouldPlayThrow(mealPhotoId);
  // 権限・デバイスのゲートは hook 内部（active = enabled && hasPermission）と
  // Camera 側で二重に掛かるため、ここでは phase だけ見る。
  const { status: modelStatus, sight, cameraPermission, requestCameraPermission, frameProcessor } =
    useToiletDetection({
      enabled: phase !== "summary",
      previewWidth: stageSize.width,
      previewHeight: stageSize.height,
    });
  const cameraStatus: UserMediaCameraStatus = gachaCameraStatus({
    permission: cameraPermission,
    hasDevice: device != null,
    cameraFailed,
  });
  const live = isLiveCameraOverlay(cameraStatus);
  // web の `detectEnabled || phase !== "staging" ? detectionStatus : "failed"` 相当。
  // カメラが使えない staging では failed 扱いにしてタップ狙い→スワイプの経路を開き、
  // それ以外の phase では idle に倒して案内文言を出さない（web は検出off→idle→文言なし）。
  const shownModelStatus: ToiletModelStatus = live
    ? modelStatus
    : phase === "staging"
      ? "failed"
      : "idle";

  const canSwipe = canStartGachaBySwipe({
    phase,
    cameraStatus,
    modelStatus: shownModelStatus,
    sight,
    hasAimPoint: aimPoint != null,
  });
  const liveTarget = resolveThrowTarget({ sight, tap: aimPoint });
  const liveTargetRef = useRef(liveTarget);
  useEffect(() => {
    liveTargetRef.current = liveTarget;
  }, [liveTarget]);
  const throwTarget = phase === "staging" ? liveTarget : heldTarget;
  const spawnTarget = resolveRevealTarget({ sight, fallback: throwTarget });
  const modelScale = sight.kind === "hit" ? gachaRevealScale(sight) : heldScale;
  const displayScale = clampRevealScale({
    scale: modelScale,
    stageWidth: stageSize.width,
    stageHeight: stageSize.height,
  });
  const spawn = clampRevealSpawn({ target: spawnTarget });
  const spawnBox = REVEAL_MODEL_BOX_PX * displayScale;

  const character = result.acquiredCharacter;
  const acquired = shouldCrawlOut(character);
  const shaking = phase === "shake" && !reduceMotion;
  const statusMessage = gachaCameraStatusMessage(cameraStatus);
  const detectionMessage = toiletDebugCopy(shownModelStatus, sight, phase === "staging");
  const revealCopy = companionshipRevealCopy({ acquired, usedMealLog: result.usedMealLog });

  // 未要求ならマウント時に許可ダイアログを出す（web の自動 start() 相当）。
  useEffect(() => {
    if (cameraPermission === "undetermined") void requestCameraPermission();
  }, [cameraPermission, requestCameraPermission]);

  // 仲間がいるときだけ、staging の間に GLB を先読みする（web のチャンク
  // プリロード相当）。reveal 開始時のデコード待ちで這い出しが遅れないように。
  useEffect(() => {
    if (!shouldCrawlOut(result.acquiredCharacter)) return;
    void loadGlb(poopm3DBaseGlb());
    void loadGlb(poopm3DHeadVarGlb(appearanceForCharacter(result.acquiredCharacter.id).head));
  }, [result.acquiredCharacter]);

  // phase タイマー。delay=null の phase（staging/reveal/summary）は操作待ち。
  useEffect(() => {
    const delay = companionshipPhaseDelay(phase, reduceMotion);
    if (delay == null) return;
    const timer = setTimeout(() => {
      setPhase((current) => nextCompanionshipArPhase(current, hasPhoto, reduceMotion));
    }, delay);
    return () => clearTimeout(timer);
  }, [hasPhoto, phase, reduceMotion]);

  const finish = useCallback(() => {
    setPhase("summary");
    onDone();
  }, [onDone]);

  const startThrow = useCallback(() => {
    setHeldTarget(liveTargetRef.current);
    setHeldScale(gachaRevealScale(sight));
    setPhase((current) => nextCompanionshipArPhase(current, hasPhoto, reduceMotion));
  }, [hasPhoto, reduceMotion, sight]);

  const handleTouchGrant = (event: GestureResponderEvent) => {
    touchStartRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    };
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const end = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    stageRef.current?.measureInWindow((left, top, width, height) => {
      const decision = resolveStageTouch({
        phase,
        start,
        end,
        stage: { left, top, width, height },
        canSwipe,
        throwTarget,
        sightIsHit: sight.kind === "hit",
      });
      if (decision.type === "confirm") finish();
      else if (decision.type === "aim") setAimPoint(decision.point);
      else if (decision.type === "throw") startThrow();
    });
  };

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize((prev) =>
      Math.round(prev.width) === Math.round(width) && Math.round(prev.height) === Math.round(height)
        ? prev
        : { width, height },
    );
  };

  // 便器揺れ。VIDEO_SHAKE_ANIMATE のキーフレームを progress 0→1 でなぞる。
  const shakeProgress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!shaking) {
      shakeProgress.setValue(0);
      return;
    }
    const anim = Animated.timing(shakeProgress, {
      toValue: 1,
      duration: VIDEO_SHAKE_TRANSITION.duration * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [shaking, shakeProgress]);
  const shakeX = shakeProgress.interpolate({
    inputRange: [...VIDEO_SHAKE_TRANSITION.times],
    outputRange: VIDEO_SHAKE_ANIMATE.x,
  });
  const shakeY = shakeProgress.interpolate({
    inputRange: [...VIDEO_SHAKE_TRANSITION.times],
    outputRange: VIDEO_SHAKE_ANIMATE.y,
  });
  const shakeRotate = shakeProgress.interpolate({
    inputRange: [...VIDEO_SHAKE_TRANSITION.times],
    outputRange: VIDEO_SHAKE_ANIMATE.rotate.map((deg) => `${deg}deg`),
  });

  // 投げ入れ写真。上中央から投げ入れ先へ縮みながら飛ぶ。
  const throwProgress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase !== "throw" || stageSize.width <= 0) return;
    if (reduceMotion) {
      throwProgress.setValue(1);
      return;
    }
    throwProgress.setValue(0);
    const anim = Animated.timing(throwProgress, {
      toValue: 1,
      duration: COMPANIONSHIP_PHASE_MS.throw,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [phase, reduceMotion, stageSize.width, throwProgress]);
  const throwX = throwProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      stageSize.width * 0.5 - THROW_PHOTO_SIZE / 2,
      (throwTarget.x / 100) * stageSize.width - THROW_PHOTO_SIZE / 2,
    ],
  });
  const throwY = throwProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      stageSize.height * 0.14 - THROW_PHOTO_SIZE / 2,
      (throwTarget.y / 100) * stageSize.height - THROW_PHOTO_SIZE / 2,
    ],
  });
  const throwScale = throwProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.28] });
  const throwRotate = throwProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "16deg"],
  });
  const throwOpacity = throwProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });

  // reveal モデルの出現位置。hit 中は検出枠へ追従するため値の変化を滑らかにする。
  // 初回配置だけはアニメなしで置く（左上から滑り込む見た目を避ける）。
  const spawnX = useRef(new Animated.Value(0)).current;
  const spawnY = useRef(new Animated.Value(0)).current;
  const spawnPlacedRef = useRef(false);
  useEffect(() => {
    if (phase !== "reveal" || stageSize.width <= 0) return;
    const nextX = (spawn.x / 100) * stageSize.width - spawnBox / 2;
    const nextY = (spawn.y / 100) * stageSize.height - spawnBox / 2;
    if (reduceMotion || !spawnPlacedRef.current) {
      spawnX.setValue(nextX);
      spawnY.setValue(nextY);
      spawnPlacedRef.current = true;
      return;
    }
    const anim = Animated.parallel([
      Animated.timing(spawnX, { toValue: nextX, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(spawnY, { toValue: nextY, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [phase, spawn.x, spawn.y, spawnBox, stageSize, reduceMotion, spawnX, spawnY]);

  const showCameraView = cameraPermission === "granted" && device != null && !cameraFailed;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg },
        styles.gap,
        styles.scrollBottom,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {phaseLabel(t, phase, canSwipe)}
        </Text>
        <Text style={styles.body}>{t("Battle.gachaDetermined")}</Text>
      </View>

      <View
        ref={stageRef}
        onLayout={onStageLayout}
        style={[styles.stage, { maxHeight: window.height * 0.62 }]}
        accessibilityLabel={
          phase === "reveal"
            ? t("Battle.gachaA11yReveal")
            : canSwipe
              ? t("Battle.gachaA11ySwipe")
              : t("Battle.gachaA11yWait")
        }
        onStartShouldSetResponder={() => phase === "staging" || phase === "reveal"}
        onResponderGrant={handleTouchGrant}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={() => {
          touchStartRef.current = null;
        }}
      >
        <Animated.View
          style={[
            styles.cameraLayer,
            { transform: [{ translateX: shakeX }, { translateY: shakeY }, { rotate: shakeRotate }] },
          ]}
        >
          {showCameraView ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={phase !== "summary"}
              resizeMode="cover"
              frameProcessor={frameProcessor}
              accessibilityLabel={t("Battle.gachaCameraView")}
              onError={() => setCameraFailed(true)}
            />
          ) : (
            <View style={styles.cameraFallback}>
              {/* web の静止背景（夜明け風の放射+グラデ）相当。 */}
              <View style={styles.cameraFallbackGlow} />
            </View>
          )}
        </Animated.View>

        <View pointerEvents="none" style={styles.bottomShade} />

        <ToiletDebugOverlay sight={sight} />

        {aimPoint && sight.kind !== "hit" ? (
          <View
            pointerEvents="none"
            style={[
              styles.aimDot,
              {
                left: (aimPoint.x / 100) * stageSize.width - 6,
                top: (aimPoint.y / 100) * stageSize.height - 6,
              },
            ]}
          />
        ) : null}

        {mealPhotoUri && phase === "throw" ? (
          <Animated.View
            pointerEvents="none"
            accessibilityLabel={t("Battle.gachaThrowPhoto")}
            style={[
              styles.throwPhoto,
              {
                opacity: throwOpacity,
                transform: [
                  { translateX: throwX },
                  { translateY: throwY },
                  { rotate: throwRotate },
                  { scale: throwScale },
                ],
              },
            ]}
          >
            <Image source={{ uri: mealPhotoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </Animated.View>
        ) : null}

        {phase === "reveal" && acquired ? (
          <RevealConfetti stageHeight={stageSize.height} reduceMotion={reduceMotion} />
        ) : null}

        {phase === "reveal" && acquired && character ? (
          <Animated.View
            pointerEvents="none"
            accessibilityLabel={character.name}
            style={[
              styles.spawnBox,
              {
                width: spawnBox,
                height: spawnBox,
                transform: [{ translateX: spawnX }, { translateY: spawnY }],
              },
            ]}
          >
            <Poopm3DGacha
              appearance={appearanceForCharacter(character.id)}
              reduceMotion={reduceMotion}
              gravityUp={gravityUp}
              overscan={REVEAL_CANVAS_OVERSCAN}
            />
          </Animated.View>
        ) : null}

        {phase === "reveal" ? (
          <Text
            accessibilityRole="alert"
            style={[styles.revealText, acquired ? styles.revealWin : styles.revealFail]}
          >
            {revealCopy}
          </Text>
        ) : null}
      </View>

      {statusMessage ? (
        <Text accessibilityRole="alert" style={styles.caption}>
          {statusMessage}
        </Text>
      ) : null}
      {detectionMessage ? (
        <Text style={styles.caption}>{detectionMessage}</Text>
      ) : null}

      <Button variant="secondary" label={t("Battle.gachaSkip")} onPress={finish} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  gap: { gap: spacing.md },
  scrollBottom: { paddingBottom: spacing.xxl },
  header: { gap: spacing.xs, alignItems: "center" },
  title: { fontFamily: fonts.black, fontSize: fontSize.title - 1, color: colors.charcoal, textAlign: "center" },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.pencilGray, textAlign: "center" },
  stage: {
    width: "100%",
    aspectRatio: 3 / 4,
    minHeight: 320,
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.fadedGray,
    backgroundColor: colors.nightInk,
  },
  cameraLayer: { position: "absolute", top: "-8%", left: "-8%", right: "-8%", bottom: "-8%" },
  cameraFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.nightInk,
  },
  cameraFallbackGlow: {
    position: "absolute",
    left: "20%",
    right: "20%",
    bottom: "4%",
    height: "38%",
    borderRadius: 999,
    backgroundColor: colors.blushWash,
    opacity: 0.18,
  },
  bottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
    backgroundColor: "rgba(0,4,55,0.45)",
  },
  sightBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.paperWhite,
    borderRadius: 8,
  },
  sightBoxLow: { borderColor: colors.cottonPink, borderStyle: "dashed" },
  aimDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.paperWhite,
  },
  throwPhoto: {
    position: "absolute",
    width: THROW_PHOTO_SIZE,
    height: THROW_PHOTO_SIZE,
    borderRadius: radius.lg,
    overflow: "hidden",
    zIndex: 20,
  },
  confetti: { position: "absolute", top: -24, borderRadius: 2 },
  spawnBox: { position: "absolute", left: 0, top: 0, zIndex: 30 },
  revealText: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    textAlign: "center",
    fontFamily: fonts.black,
    fontSize: 30,
    zIndex: 40,
  },
  revealWin: { color: colors.flushPink },
  revealFail: { color: colors.charcoal },
  caption: { fontFamily: fonts.bold, fontSize: 12, color: colors.pencilGray, textAlign: "center" },
});
