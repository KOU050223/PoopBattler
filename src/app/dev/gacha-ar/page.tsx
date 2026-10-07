"use client";

import { notFound } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { CompanionshipArStage } from "@/features/battle/components/companionship-ar-stage";
import { useGravityFloor } from "@/features/battle/hooks/use-gravity-floor";
import type { CompleteBattleResult } from "@/features/battle/actions";
import {
  inspectMotionPermission,
  readBrowserMotionEnv,
  requestMotionPermission,
  type MotionEnvironment,
  type MotionPermission,
} from "@/lib/motion";

const DEMO_RESULT: Extract<CompleteBattleResult, { success: true }> = {
  success: true,
  battleId: "00000000-0000-4000-8000-000000000001",
  companionshipResult: true,
  acquiredCharacter: {
    id: "curry-poop",
    name: "カレーうんちくん",
    attribute: "curry",
    rarity: "common",
  },
  completedAt: "2026-10-03T04:00:00.000Z",
  usedMealLog: true,
  isFirstCompletedBattle: false,
};

// iOS では DeviceMotion の許可がユーザー操作起点で必要。バトルを挟まない
// このページではボタンから取る。Android は requestPermission 自体がなく granted 扱い。
// 判定はマウント後に行う（SSR時は env が取れず unsupported に見えるため）。
function MotionPermissionButton({ env }: { env: MotionEnvironment | null }) {
  // 許可ダイアログの結果だけは state に持ち、初期値は env から毎回導出する。
  const [override, setOverride] = useState<MotionPermission | null>(null);
  const permission = override ?? (env ? inspectMotionPermission(env) : null);

  if (!env || permission == null) {
    return <span>motion: …</span>;
  }

  if (permission !== "prompt") {
    return <span>motion: {permission}</span>;
  }

  return (
    <button
      type="button"
      className="rounded-lg border-2 border-night-ink bg-night-ink px-2.5 py-1 text-xs font-medium text-paper-white"
      onClick={() => {
        void requestMotionPermission(readBrowserMotionEnv()).then(setOverride);
      }}
    >
      モーション許可
    </button>
  );
}

function GravityDebug({ env }: { env: MotionEnvironment | null }) {
  const { angleDeg, up } = useGravityFloor();
  const [raw, setRaw] = useState<{ x: number; y: number; z: number } | null>(null);

  useEffect(() => {
    function handle(event: DeviceMotionEvent) {
      const g = event.accelerationIncludingGravity;
      if (g?.x == null || g.y == null || g.z == null) return;
      setRaw({ x: g.x, y: g.y, z: g.z });
    }
    window.addEventListener("devicemotion", handle);
    return () => window.removeEventListener("devicemotion", handle);
  }, []);

  return (
    <span>
      secure {env ? String(env.isSecureContext) : "?"} / DME{" "}
      {env?.DeviceMotionEvent == null
        ? "none"
        : typeof env.DeviceMotionEvent.requestPermission === "function"
          ? "ios"
          : "std"}{" "}
      / g {raw ? `(${raw.x.toFixed(1)}, ${raw.y.toFixed(1)}, ${raw.z.toFixed(1)})` : "null"}
      / angle {angleDeg.toFixed(0)}° / up{" "}
      {up ? `(${up.x.toFixed(2)}, ${up.y.toFixed(2)}, ${up.z.toFixed(2)})` : "null"}
    </span>
  );
}

// スマホ実機検証用: バトル・食事ログを経由せず AR ガチャ演出を直接開く。
// 写真がないのでスワイプ → shake → reveal の短いフローになる。
export default function DevGachaArPage() {
  // window 依存の値なので SSR/初回描画は null スナップショットで揃える。
  const env = useSyncExternalStore(
    () => () => {},
    () => readBrowserMotionEnv(),
    () => null,
  );

  // 実機検証は HTTPS トンネル（cloudflared 等）越しの dev サーバーで行える
  // （allowedDevOrigins にトンネルのホストを許可すること）。本番ビルドでも
  // 見せたい場合だけ NEXT_PUBLIC_DEV_GACHA_AR=1 を付ける。
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.NEXT_PUBLIC_DEV_GACHA_AR !== "1"
  ) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-faded-gray bg-paper-white px-3 py-2 text-[11px] text-pencil-gray">
        <MotionPermissionButton env={env} />
        <GravityDebug env={env} />
      </div>
      <CompanionshipArStage result={DEMO_RESULT} mealPhotoId={null} />
    </div>
  );
}
