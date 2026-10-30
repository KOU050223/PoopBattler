import { router } from "expo-router";
import { useCallback, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";

import { keyValueStorage } from "@/adapters/storage";
import { BattleCompletionFlow, type BattleCompletedPayload } from "@/features/battle/components/battle-completion-flow";
import { BattleResultView } from "@/features/battle/components/battle-result-view";
import { loadBattlePartyIds } from "@/features/collection/party-lineup-storage";
import { ensureAnonymousSession } from "@/lib/anonymous-session";
import { getSupabase } from "@/lib/supabase";
import { loadOwnedCharacterIds, startBattleAction } from "@/features/battle/supabase-gateway";

import { companionRunnerStats } from "../companion-stats";
import { IDLE_PHASE, reduceToiletFlow } from "../toilet-flow";
import { RaceTitle } from "./RaceTitle";
import { RaceView, ResultView } from "./RaceScreen";
import { buildPlayerSessionOptions, seedOfClock } from "./race-screen-setup";

type Completed = BattleCompletedPayload;

/**
 * トイレで記録するときの本編画面：レース → 結果 → 記録。1回の記録につきレースは1本だけ（連戦・延長なし）。
 * 記録のサーバー契約は旧バトルと同じ（start_battle で battleId を確保 → 記録フロー → complete_battle）。
 * レースの勝敗・着順は記録にも育成にも渡さない（game-design.md 3章）。
 */
export function ToiletRaceScreen() {
  const { t } = useTranslation();
  const [flow, dispatch] = useReducer(reduceToiletFlow, IDLE_PHASE);
  const [seed, setSeed] = useState(0);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // レースを遊ぶ・遊ばないのどちらでも、記録の入れ物（battleId）はサーバーで確保する
  const reserveBattle = useCallback(async (): Promise<string | null> => {
    setIsStarting(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const session = await ensureAnonymousSession(supabase.auth);
      if (session.status === "error") {
        setError(t("Battle.startError"));
        return null;
      }
      const ownedIds = await loadOwnedCharacterIds(supabase).catch(() => []);
      const userCharacterIds = await loadBattlePartyIds(keyValueStorage, ownedIds);
      const result = await startBattleAction(supabase, { userCharacterIds });
      if (result.status === "error") {
        setError(result.message);
        return null;
      }
      return result.battleId;
    } catch {
      setError(t("Battle.startError"));
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [t]);

  const startRace = async () => {
    const battleId = await reserveBattle();
    if (!battleId) return;
    setSeed(seedOfClock(Date.now()));
    dispatch({ type: "start", battleId });
  };

  const skipRace = async () => {
    const battleId = await reserveBattle();
    if (battleId) dispatch({ type: "skip", battleId });
  };

  if (completed) {
    return <BattleResultView completed={completed} onDone={() => router.replace("/")} doneLabel={t("Battle.backHome")} />;
  }

  if (flow.phase === "race") {
    return (
      <RaceView
        key={seed}
        options={buildPlayerSessionOptions(companionRunnerStats(), true, seed)}
        onOver={(result) => dispatch({ type: "raceOver", result })}
        onQuit={() => dispatch({ type: "skip", battleId: flow.battleId })}
      />
    );
  }

  if (flow.phase === "result") {
    return <ResultView result={flow.result} primaryLabel={t("Battle.raceToRecord")} onPrimary={() => dispatch({ type: "toRecord" })} />;
  }

  if (flow.phase === "record") {
    return (
      <BattleCompletionFlow
        battleId={flow.battleId}
        onCompleted={setCompleted}
        onAbandon={() => router.replace("/")}
      />
    );
  }

  return (
    <RaceTitle
      isStarting={isStarting}
      errorMessage={error}
      onStart={() => void startRace()}
      onSkip={() => void skipRace()}
      onBack={() => router.replace("/")}
    />
  );
}
