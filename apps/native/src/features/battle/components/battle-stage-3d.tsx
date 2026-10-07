import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { BattleSnapshot } from "@poopbattler/domain/battle/battle.types";

import { colors, fontSize, fonts, radius, spacing } from "@/theme";
import { Poopm3DStage } from "../../poopm-3d/components/poopm-3d-stage";
import { useBattleStore } from "../battle-store";
import { advanceBattleStage, initialBattleStageState, observeBattleStage, reduceBattleStage } from "../battle-stage-motion";
import { appearanceForCharacter } from "../poopm-appearance";
import { HpBar } from "./battle-stage";

type StageSnapshot = BattleSnapshot & {
  party: NonNullable<BattleSnapshot["party"]>;
  enemy: NonNullable<BattleSnapshot["enemy"]>;
};

/** 3D ステージ。Canvas を全面に敷き、HPバー・必殺チャージ表示は RN オーバーレイで重ねる。 */
export function BattleStage3D({ snapshot, speed }: { snapshot: StageSnapshot; speed: number }) {
  const { t } = useTranslation();
  const [stageState, setStageState] = useState(() =>
    reduceBattleStage(initialBattleStageState(), observeBattleStage(useBattleStore.getState())),
  );

  // ストア更新を購読し、スナップショットの差分から両者のモーションを決める（ko→swap_in の順序づけもここ）。
  useEffect(
    () => useBattleStore.subscribe((state: BattleSnapshot) => setStageState((prev) => reduceBattleStage(prev, observeBattleStage(state)))),
    [],
  );

  const handleMotionFinished = useCallback(
    (side: "player" | "enemy") => setStageState((prev) => advanceBattleStage(prev, side)),
    [],
  );

  const member = snapshot.party[snapshot.activeIndex];
  // ko 再生中は退場したメンバーを表示し続ける（displayedIndex が遅れる）。
  const displayed = snapshot.party[stageState.displayedIndex] ?? member;

  return (
    <View style={styles.stage}>
      <View style={StyleSheet.absoluteFill}>
        <Poopm3DStage
          player={{ appearance: appearanceForCharacter(displayed.characterId), motion: stageState.player }}
          enemy={{ appearance: appearanceForCharacter(snapshot.enemy.characterId), motion: stageState.enemy }}
          speed={speed}
          onMotionFinished={handleMotionFinished}
        />
      </View>
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.enemyHp}>
          <HpBar label={snapshot.enemy.name ?? t("Battle.enemyDefault")} current={snapshot.enemy.hp} max={snapshot.enemy.maxHp} side="enemy" />
        </View>
        <View style={styles.allyHp}>
          <HpBar label={member.name ?? t("Battle.allyDefault")} current={member.hp} max={member.maxHp} side="ally" />
          {snapshot.playerStance === "special" ? <Text style={styles.charging}>{t("Battle.specialCharging")}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 280,
    overflow: "hidden",
    backgroundColor: colors.paperWhite,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cottonPink,
  },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "space-between", padding: spacing.lg },
  enemyHp: { alignSelf: "flex-end", width: "62%", gap: spacing.sm },
  allyHp: { alignSelf: "flex-start", width: "62%", gap: spacing.sm },
  charging: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.flushEdge },
});
