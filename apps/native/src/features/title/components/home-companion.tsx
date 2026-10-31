import { Component, useCallback, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { PoopmSprite } from "@/features/battle/components/poopm-sprite";
import type { PoopmAppearance } from "@/features/battle/poopm-appearance";
import { Poopm3DSolo } from "@/features/poopm-3d/components/poopm-3d-solo";

// PoopmSprite は幅 size に対して高さ size * 260 / 207。3D も同じ箱に収めて入れ替え時にレイアウトが動かないようにする。
const SPRITE_HEIGHT_RATIO = 260 / 207;
// 足元の接地影は足裏より手前（画面の下側）へ広がるので、箱ぴったりだとキャンバス端で切れる。
// 描画領域だけ広げる（モデルの見かけの大きさは変わらない）。
const SHADOW_OVERSCAN = 1.35;
const IDLE_MOTION = { name: "idle", nonce: 0 } as const;

// GL コンテキストの生成失敗など描画中の例外で、ホーム全体を落とさず 2D に戻すための境界。
class FallbackBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[home] 3D 描画に失敗。2D 表示に戻す:", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// ホームの相棒。3D が描けるまでは何も出さず（旧 2D が一瞬見えて切り替わるのを避ける）、失敗したときだけ 2D を出す。
// 3D は触れない（pointerEvents none）ので、タップは親の Pressable がそのまま受ける。
export function HomeCompanion({ appearance, size }: { appearance: PoopmAppearance; size: number }) {
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const handleReady = useCallback(() => setIsReady(true), []);
  const handleFail = useCallback(() => setHasFailed(true), []);

  const height = Math.round(size * SPRITE_HEIGHT_RATIO);

  return (
    <View style={{ width: size, height }}>
      {hasFailed && <PoopmSprite appearance={appearance} hitKey={0} size={size} />}
      {!hasFailed && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, !isReady && styles.hidden]}>
          <FallbackBoundary onError={handleFail}>
            <Poopm3DSolo appearance={appearance} motion={IDLE_MOTION} overscan={SHADOW_OVERSCAN} onReady={handleReady} onLoadError={handleFail} />
          </FallbackBoundary>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 読み込み中も Canvas は生かしておく（unmount すると読み込みが始まらない）。未完成のモデルが見えないよう透明にする。
  hidden: { opacity: 0 },
});
