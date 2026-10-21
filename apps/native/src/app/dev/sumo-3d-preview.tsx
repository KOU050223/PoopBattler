import { useRef, useState } from "react";
import { View } from "react-native";

import { DIFF_MAKUSHITA, newGame, SPECIES, createRng } from "@/features/sumo";
import { SumoStage3D } from "@/features/sumo/three/SumoStage3D";
import type { Game } from "@/features/sumo/types";

const PREVIEW_SEED = 1;

/** うんち相撲3Dの土俵・力士の見た目確認用。dev 専用。ロジックは進めず、静かな構えだけ見る */
export default function Sumo3dPreviewScreen() {
  const [game] = useState<Game>(() => newGame({ speciesEast: SPECIES[0], speciesWest: SPECIES[2], diff: DIFF_MAKUSHITA, rand: createRng(PREVIEW_SEED) }));
  const gameRef = useRef(game);

  return (
    <View style={{ flex: 1, backgroundColor: "#1d1510" }}>
      <SumoStage3D gameRef={gameRef} playerSpecies={SPECIES[0]} opponentSpecies={SPECIES[2]} isPreFight />
    </View>
  );
}
