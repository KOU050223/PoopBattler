"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { readBattleSpeed, subscribeBattleSpeed, writeBattleSpeed } from "@/features/battle/battle-speed";
import {
  startBattleAction,
  type CompleteBattleResult,
} from "@/features/battle/actions";
import { BattleCompletionFlow } from "@/features/battle/components/battle-completion-flow";
import {
  ATTRIBUTE_LABELS,
  DEFAULT_BATTLE_SPEED,
  HIT_MOTION_MS,
  SPECIAL_GAUGE_MAX,
  matchupTone,
  nextBattleSpeed,
  scaleByBattleSpeed,
  tickIntervalMs,
  type BattleSpeed,
} from "@/features/battle/battle.constants";
import { BattleControls } from "@/features/battle/components/battle-controls";
import { BattleCompletionResult } from "@/features/battle/components/battle-completion-result";
import { BattleFigure } from "@/features/battle/components/battle-figure";
import { useBattleWakeLock } from "@/features/battle/hooks/use-battle-wake-lock";
import { useSpecialMotion } from "@/features/battle/hooks/use-special-motion";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { captionTextClass, mutedTextClass, primaryButtonClass, stancePillClass } from "@/lib/ui-classes";
import { signInAnonymouslyFromBrowser } from "@/lib/supabase/anonymous-session";
import { useBattleStore } from "@/stores/battle-store";

const MATCHUP_LABEL = {
  advantage: "有利",
  neutral: "等倍",
  disadvantage: "不利",
} as const;

const MATCHUP_CLASS = {
  advantage: "bg-blush-wash text-charcoal",
  neutral: "border-2 border-faded-gray bg-paper-white text-pencil-gray",
  disadvantage: "bg-night-ink text-paper-white",
} as const;

function subscribeHydration(onChange: () => void) {
  return useBattleStore.persist.onFinishHydration(onChange);
}

function HpBar({
  current,
  max,
  label,
  side,
  hitFlashKey,
  speed,
}: {
  current: number;
  max: number;
  label: string;
  side: "ally" | "enemy";
  hitFlashKey: number;
  speed: BattleSpeed;
}) {
  const reduceMotion = useReducedMotion();
  const ratio = Math.max(0, Math.min(1, current / max));
  const fillClass = side === "enemy" ? "bg-night-ink" : "bg-flush-pink";
  const flashColor = "var(--color-danger-edge)";
  const textColor = "var(--color-pencil-gray)";
  const textFlash = reduceMotion
    ? [textColor, flashColor, textColor]
    : [textColor, flashColor, flashColor, textColor];
  const barFlashOpacity = reduceMotion ? [0, 1, 0] : [0, 1, 1, 0];
  const flashTransition = {
    duration: scaleByBattleSpeed(reduceMotion ? 0.45 : 0.95, speed),
    ease: "easeInOut" as const,
    times: reduceMotion ? [0, 0.55, 1] : [0, 0.16, 0.72, 1],
  };
  return (
    <div className="flex w-full flex-col gap-1">
      <motion.div
        key={`hp-text-${hitFlashKey}`}
        className={`flex justify-between ${captionTextClass}`}
        initial={{ color: textColor }}
        animate={hitFlashKey > 0 ? { color: textFlash } : undefined}
        transition={hitFlashKey > 0 ? flashTransition : undefined}
        style={{ color: textColor }}
      >
        <span>{label}</span>
        <span>
          {current} / {max}
        </span>
      </motion.div>
      <div className="relative h-2 overflow-hidden rounded-full bg-blush-wash">
        <motion.div
          className={`h-full ${fillClass}`}
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.2 }}
        />
        {hitFlashKey > 0 ? (
          <motion.div
            key={`hp-bar-flash-${hitFlashKey}`}
            aria-hidden="true"
            className="absolute left-0 top-0 h-full bg-danger-edge"
            initial={{ opacity: 0, width: `${ratio * 100}%` }}
            animate={{ opacity: barFlashOpacity }}
            transition={flashTransition}
          />
        ) : null}
      </div>
    </div>
  );
}

function StrainGauge({ progress }: { progress: number }) {
  const ratio = Math.max(0, Math.min(1, progress));
  const percent = Math.round(ratio * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className={`flex justify-between ${captionTextClass}`}>
        <span>踏ん張り</span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-blush-wash"
        role="progressbar"
        aria-label="踏ん張り"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full bg-night-ink"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p role="status" className="text-center text-sm text-charcoal">
        振り続けて発射！
      </p>
    </div>
  );
}

export function BattleScreen() {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => useBattleStore.persist.hasHydrated(),
    () => false,
  );
  const snapshot = useBattleStore((state) => state);
  const [acceptedRestore, setAcceptedRestore] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionResult, setCompletionResult] = useState<Extract<
    CompleteBattleResult,
    { success: true }
  > | null>(null);
  const [playerMotion, setPlayerMotion] = useState<"idle" | "hit" | "attack">(
    "idle",
  );
  const [enemyMotion, setEnemyMotion] = useState<"idle" | "hit" | "attack">(
    "idle",
  );
  const [playerHitFlashKey, setPlayerHitFlashKey] = useState(0);
  const [enemyHitFlashKey, setEnemyHitFlashKey] = useState(0);
  const speed = useSyncExternalStore(
    subscribeBattleSpeed,
    () => readBattleSpeed(window.localStorage),
    () => DEFAULT_BATTLE_SPEED,
  );
  const previousHp = useRef<{ player: number; enemy: number } | null>(null);
  const { reason, strainProgress, activateSpecial } = useSpecialMotion();

  const showRestore =
    hydrated && snapshot.status === "active" && !acceptedRestore;
  const showStart = hydrated && snapshot.status === "idle" && !starting;

  useBattleWakeLock(snapshot.status === "active" && !showRestore);

  function toggleSpeed() {
    writeBattleSpeed(window.localStorage, nextBattleSpeed(speed));
  }

  useEffect(() => {
    if (snapshot.status !== "active" || showRestore) {
      return;
    }
    const timer = window.setInterval(() => {
      useBattleStore.getState().tick();
    }, tickIntervalMs(speed));
    return () => window.clearInterval(timer);
  }, [snapshot.status, showRestore, speed]);

  useEffect(() => {
    const enemyHp = snapshot.enemy?.hp;
    const playerHp = snapshot.party?.[snapshot.activeIndex]?.hp;
    if (enemyHp == null || playerHp == null) {
      return;
    }
    const previous = previousHp.current;
    previousHp.current = { player: playerHp, enemy: enemyHp };
    if (!previous) {
      return;
    }
    if (enemyHp < previous.enemy) {
      setEnemyHitFlashKey((key) => key + 1);
      setEnemyMotion("hit");
      setPlayerMotion("attack");
    } else if (playerHp < previous.player) {
      setPlayerHitFlashKey((key) => key + 1);
      setPlayerMotion("hit");
      setEnemyMotion("attack");
    } else {
      return;
    }
    const timer = window.setTimeout(() => {
      setPlayerMotion("idle");
      setEnemyMotion("idle");
    }, scaleByBattleSpeed(HIT_MOTION_MS, speed));
    return () => window.clearTimeout(timer);
  }, [snapshot.activeIndex, snapshot.enemy?.hp, snapshot.party, speed]);

  async function startBattle() {
    setStarting(true);
    setError(null);
    const session = await signInAnonymouslyFromBrowser();
    if (session.status === "error") {
      setStarting(false);
      setError("プレイの準備ができていません。時間をおいて再試行してください。");
      return;
    }

    const result = await startBattleAction();
    setStarting(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }

    const current = useBattleStore.getState();
    if (
      result.resumed &&
      current.battleId === result.battleId &&
      current.status === "active"
    ) {
      setAcceptedRestore(true);
      return;
    }

    current.start({
      battleId: result.battleId,
      enemy: {
        characterId: result.enemy.characterId,
        attribute: result.enemy.attribute,
        name: result.enemy.name,
        hp: result.enemyHp,
        power: result.enemyPower,
        speed: result.enemySpeed,
      },
      party: result.party,
    });
    setAcceptedRestore(true);
  }

  function handleBattleCompleted(
    result: Extract<CompleteBattleResult, { success: true }>,
  ) {
    // DB確定に成功したときだけ、復元用のバトル・排便下書きを破棄する。
    setCompletionResult(result);
    useBattleStore.getState().reset();
    setAcceptedRestore(false);
  }

  if (!hydrated) {
    return <LoadingState label="バトルの状態を読み込んでいます…" />;
  }

  if (completionResult) {
    return <BattleCompletionResult result={completionResult} />;
  }

  if (showRestore && snapshot.enemy) {
    return (
      <section className="flex flex-col gap-4">
        <p>進行中のバトルがあります。続きから再開します。</p>
        <p className={mutedTextClass}>
          敵: {snapshot.enemy.name ?? ATTRIBUTE_LABELS[snapshot.enemy.attribute]}
        </p>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => setAcceptedRestore(true)}
        >
          続ける
        </button>
      </section>
    );
  }

  if (snapshot.status === "completing" && snapshot.enemy) {
    if (!snapshot.battleId) {
      return (
        <ErrorState
          description="バトル情報を確認できませんでした。もう一度お試しください。"
        />
      );
    }

    return (
      <BattleCompletionFlow
        battleId={snapshot.battleId}
        onCompleted={handleBattleCompleted}
        onAbandon={() => {
          useBattleStore.getState().reset();
          setAcceptedRestore(false);
        }}
      />
    );
  }

  if (snapshot.status === "defeated" && snapshot.enemy) {
    return (
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="text-xl font-bold">敗北</p>
        <p className={mutedTextClass}>
          やられました。バトルを終えて、もう一度始められます。
        </p>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => {
            useBattleStore.getState().reset();
            setAcceptedRestore(false);
          }}
        >
          バトルを終える
        </button>
      </section>
    );
  }

  if (snapshot.status === "active" && snapshot.party && snapshot.enemy) {
    const member = snapshot.party[snapshot.activeIndex];
    const tone = matchupTone(member.attribute, snapshot.enemy.attribute);
    return (
      <section className="flex flex-col gap-5">
        <div className="relative flex items-center justify-center">
          <p
            className={`rounded-xl px-3 py-1 text-xs font-medium ${MATCHUP_CLASS[tone]}`}
          >
            {MATCHUP_LABEL[tone]}
          </p>
          <button
            type="button"
            className={`absolute right-0 ${stancePillClass(speed === 2, false)}`}
            aria-pressed={speed === 2}
            aria-label={speed === 2 ? "等倍に戻す" : "倍速にする"}
            onClick={toggleSpeed}
          >
            ×{speed}
          </button>
        </div>
        <div className="relative flex min-h-72 flex-col justify-between overflow-hidden rounded-2xl border-2 border-faded-gray bg-paper-white px-4 py-5 shadow-raised-gray">
          <div className="flex flex-col items-end gap-2 pl-16">
            <HpBar
              current={snapshot.enemy.hp}
              max={snapshot.enemy.maxHp}
              label={snapshot.enemy.name ?? "てき"}
              side="enemy"
              hitFlashKey={enemyHitFlashKey}
              speed={speed}
            />
            <BattleFigure
              characterId={snapshot.enemy.characterId}
              attribute={snapshot.enemy.attribute}
              facing="front"
              motion={enemyMotion}
              label={snapshot.enemy.name ?? "てき"}
              depth="far"
              speed={speed}
            />
          </div>
          <div className="flex flex-col items-start gap-2 pr-16">
            <BattleFigure
              characterId={member.characterId}
              attribute={member.attribute}
              facing="back"
              motion={playerMotion}
              label={member.name ?? "味方"}
              depth="near"
              speed={speed}
            />
            <HpBar
              current={member.hp}
              max={member.maxHp}
              label={member.name ?? "味方"}
              side="ally"
              hitFlashKey={playerHitFlashKey}
              speed={speed}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className={`flex justify-between ${captionTextClass}`}>
            <span>必殺ゲージ</span>
            <span>
              {snapshot.playerGauge} / {SPECIAL_GAUGE_MAX}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blush-wash">
            <div
              className="h-full bg-night-ink"
              style={{
                width: `${(snapshot.playerGauge / SPECIAL_GAUGE_MAX) * 100}%`,
              }}
            />
          </div>
        </div>
        {snapshot.playerStance === "special" ? (
          <StrainGauge progress={strainProgress} />
        ) : null}
        <BattleControls
          party={snapshot.party}
          activeIndex={snapshot.activeIndex}
          playerStance={snapshot.playerStance}
          playerGauge={snapshot.playerGauge}
          playerGuardCooldownTicks={snapshot.playerGuardCooldownTicks}
          switchStunTicks={snapshot.switchStunTicks}
          benchGauges={snapshot.benchGauges}
          onGuard={() => useBattleStore.getState().setStance("guard")}
          onSpecial={activateSpecial}
          onSwitch={(index) => useBattleStore.getState().switchMember(index)}
          specialReason={reason}
          onDebugStrain={() => useBattleStore.getState().fireSpecial()}
          onDebugComplete={() => useBattleStore.getState().markCompleting()}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {error ? (
        <ErrorState
          description={error}
          onRetry={() => void startBattle()}
        />
      ) : null}
      {starting ? <LoadingState label="敵を呼び出しています…" /> : null}
      {showStart ? (
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => void startBattle()}
        >
          バトルを始める
        </button>
      ) : null}
    </section>
  );
}
