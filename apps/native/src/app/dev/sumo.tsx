import { router } from "expo-router";
import { useState } from "react";

import { FightView } from "@/features/sumo/ui/FightView";
import { SetupView } from "@/features/sumo/ui/SetupView";
import { DEFAULT_SETUP, type MatchSetup } from "@/features/sumo/ui/session";

/** うんち相撲の NPC 戦（最小UI）。dev 専用。 */
export default function SumoScreen() {
  const [setup, setSetup] = useState<MatchSetup>(DEFAULT_SETUP);
  // matchId を key にして、もう一度で新しい対局を作り直す。null は設定画面
  const [matchId, setMatchId] = useState<number | null>(null);

  if (matchId === null) {
    return <SetupView setup={setup} onChange={setSetup} onStart={() => setMatchId(1)} onBack={() => router.back()} />;
  }
  return <FightView key={matchId} setup={setup} onRematch={() => setMatchId(matchId + 1)} onQuit={() => setMatchId(null)} />;
}
