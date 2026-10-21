import { router } from "expo-router";
import { useState } from "react";

import { FightView } from "@/features/sumo/ui/FightView";
import { SetupView } from "@/features/sumo/ui/SetupView";
import { DEFAULT_SETUP, resolveOpponent, type MatchSetup } from "@/features/sumo/ui/session";

/** うんちくん相撲の NPC 戦。dev 専用。 */
export default function SumoScreen() {
  const [setup, setSetup] = useState<MatchSetup>(DEFAULT_SETUP);
  // 取組に使う設定（おまかせの相手を決めたあと）と、取組ごとに変える key。null は開始前メニュー
  const [match, setMatch] = useState<{ id: number; setup: MatchSetup } | null>(null);

  const begin = (id: number) => setMatch({ id, setup: resolveOpponent(setup, Math.random) });

  if (match === null) {
    return <SetupView setup={setup} onChange={setSetup} onStart={() => begin(1)} onBack={() => router.back()} />;
  }
  return <FightView key={match.id} setup={match.setup} onRematch={() => begin(match.id + 1)} onQuit={() => setMatch(null)} />;
}
