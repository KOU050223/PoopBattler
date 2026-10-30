import { Component, useCallback, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { PoopmSprite } from "@/features/battle/components/poopm-sprite";
import type { PoopmAppearance } from "@/features/battle/poopm-appearance";
import { Poopm3DSolo } from "@/features/poopm-3d/components/poopm-3d-solo";

// PoopmSprite は幅 size に対して高さ size * 260 / 207。3D も同じ箱に収めて入れ替え時にレイアウトが動かないようにする。
const SPRITE_HEIGHT_RATIO = 260 / 207;
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

// ホームの相棒。3D が描ける状態になるまで・失敗したときは従来の 2D を出す。
// 3D は触れない（pointerEvents none）ので、タップは親の Pressable がそのまま受ける。
export function HomeCompanion({ appearance, size }: { appearance: PoopmAppearance; size: number }) {
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const handleReady = useCallback(() => setIsReady(true), []);
  const handleFail = useCallback(() => setHasFailed(true), []);

  const height = Math.round(size * SPRITE_HEIGHT_RATIO);
  const showsSprite = !isReady || hasFailed;

  return (
    <View style={{ width: size, height }}>
      {showsSprite && <PoopmSprite appearance={appearance} hitKey={0} size={size} />}
      {!hasFailed && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, !isReady && styles.hidden]}>
          <FallbackBoundary onError={handleFail}>
            <Poopm3DSolo appearance={appearance} motion={IDLE_MOTION} onReady={handleReady} onLoadError={handleFail} />
          </FallbackBoundary>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 読み込み中も Canvas は生かしておく（unmount すると読み込みが始まらない）。2D と重ならないよう透明にする。
  hidden: { opacity: 0 },
});
