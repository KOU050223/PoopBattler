"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";

import { startBattleAction } from "@/features/battle/actions";
import {
  ATTRIBUTE_LABELS,
  INITIAL_ENEMY_HP,
  INITIAL_MEMBER_HP,
  SPECIAL_GAUGE_MAX,
  TICK_INTERVAL_MS,
  matchupTone,
} from "@/features/battle/battle.constants";
import { BattleControls } from "@/features/battle/components/battle-controls";
import { BattleFigure } from "@/features/battle/components/battle-figure";
import { useBattleWakeLock } from "@/features/battle/hooks/use-battle-wake-lock";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useBattleStore } from "@/stores/battle-store";

const MATCHUP_LABEL = {
  advantage: "有利",
  neutral: "等倍",
  disadvantage: "不利",
} as const;

const MATCHUP_CLASS = {
  advantage:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  disadvantage: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
} as const;

function subscribeHydration(onChange: () => void) {
  return useBattleStore.persist.onFinishHydration(onChange);
}

function HpBar({
  current,
  max,
  label,
}: {
  current: number;
  max: number;
  label: string;
}) {
  const ratio = Math.max(0, Math.min(1, current / max));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
        <span>{label}</span>
        <span>
          {current} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <motion.div
          className="h-full bg-zinc-900 dark:bg-zinc-100"
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
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
  const [playerMotion, setPlayerMotion] = useState<"idle" | "hit" | "attack">(
    "idle",
  );
  const [enemyMotion, setEnemyMotion] = useState<"idle" | "hit" | "attack">(
    "idle",
  );
  const previousHp = useRef<{ player: number; enemy: number } | null>(null);

  const showRestore =
    hydrated && snapshot.status === "active" && !acceptedRestore;
  const showResult =
    snapshot.status === "completing" || snapshot.status === "defeated";
  const showStart = hydrated && snapshot.status === "idle" && !starting;

  useBattleWakeLock(snapshot.status === "active" && !showRestore);

  useEffect(() => {
    if (snapshot.status !== "active" || showRestore) {
      return;
    }
    const timer = window.setInterval(() => {
      useBattleStore.getState().tick();
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [snapshot.status, showRestore]);

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
      setEnemyMotion("hit");
      setPlayerMotion("attack");
    } else if (playerHp < previous.player) {
      setPlayerMotion("hit");
      setEnemyMotion("attack");
    } else {
      return;
    }
    const timer = window.setTimeout(() => {
      setPlayerMotion("idle");
      setEnemyMotion("idle");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [snapshot.activeIndex, snapshot.enemy?.hp, snapshot.party]);

  async function startBattle() {
    setStarting(true);
    setError(null);
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
      },
      party: result.party,
    });
    setAcceptedRestore(true);
  }

  if (!hydrated) {
    return <LoadingState label="バトルの状態を読み込んでいます…" />;
  }

  if (showRestore && snapshot.enemy) {
    return (
      <section className="flex flex-col gap-4">
        <p>進行中のバトルがあります。続きから再開します。</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          敵: {snapshot.enemy.name ?? ATTRIBUTE_LABELS[snapshot.enemy.attribute]}
        </p>
        <button
          type="button"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          onClick={() => setAcceptedRestore(true)}
        >
          続ける
        </button>
      </section>
    );
  }

  if (showResult && snapshot.enemy) {
    const won = snapshot.status === "completing";
    return (
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="text-xl font-bold">{won ? "勝利" : "敗北"}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {won
            ? "撃破しました。排便の記録へ進めます。"
            : "やられました。排便の記録へ進めます。"}
        </p>
        <button
          type="button"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
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
        <p
          className={`self-center rounded-full px-3 py-1 text-xs font-medium ${MATCHUP_CLASS[tone]}`}
        >
          {MATCHUP_LABEL[tone]}
        </p>
        <HpBar
          current={snapshot.enemy.hp}
          max={INITIAL_ENEMY_HP}
          label={snapshot.enemy.name ?? "てき"}
        />
        <div className="flex items-end justify-around">
          <BattleFigure
            attribute={member.attribute}
            facing="back"
            motion={playerMotion}
            label={member.name ?? "味方"}
          />
          <BattleFigure
            attribute={snapshot.enemy.attribute}
            facing="front"
            motion={enemyMotion}
            label={snapshot.enemy.name ?? "てき"}
          />
        </div>
        <HpBar
          current={member.hp}
          max={INITIAL_MEMBER_HP}
          label={member.name ?? "味方"}
        />
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span>必殺ゲージ</span>
            <span>
              {snapshot.playerGauge} / {SPECIAL_GAUGE_MAX}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-amber-500"
              style={{
                width: `${(snapshot.playerGauge / SPECIAL_GAUGE_MAX) * 100}%`,
              }}
            />
          </div>
        </div>
        {snapshot.playerStance === "special" ? (
          <p role="status" className="text-center text-sm">
            踏ん張って発射！
          </p>
        ) : null}
        <BattleControls
          party={snapshot.party}
          activeIndex={snapshot.activeIndex}
          playerStance={snapshot.playerStance}
          playerGauge={snapshot.playerGauge}
          playerGuardCooldownTicks={snapshot.playerGuardCooldownTicks}
          switchStunTicks={snapshot.switchStunTicks}
          onFight={() => useBattleStore.getState().setStance("fight")}
          onGuard={() => useBattleStore.getState().setStance("guard")}
          onSwitch={(index) => useBattleStore.getState().switchMember(index)}
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
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          onClick={() => void startBattle()}
        >
          バトルを始める
        </button>
      ) : null}
    </section>
  );
}
