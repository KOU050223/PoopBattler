import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { usesCompanionshipAr } from "@poopbattler/domain/battle/companionship-ar";

import { Button } from "@/components/ui";
import { colors, fontSize, fonts, radius, spacing } from "@/theme";

import { PoopmFigure3D } from "../../poopm-3d/components/poopm-figure-3d";
import { appearanceForCharacter } from "../poopm-appearance";
import type { BattleCompletedPayload } from "./battle-completion-flow";
import { CompanionshipArStage } from "./companionship-ar-stage";

interface BattleResultViewProps {
  completed: BattleCompletedPayload;
  onDone: () => void;
  doneLabel: string;
}

/** 記録の確定後の画面。食事ログを使った完了なら、結果の前に AR ガチャ（仲間化演出）を挟む。カメラ非対応・権限拒否はステージ内で静止背景に逃がす */
export function BattleResultView({ completed, onDone, doneLabel }: BattleResultViewProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isArDone, setIsArDone] = useState(false);
  const { result, mealPhotoId } = completed;

  if (usesCompanionshipAr(result) && !isArDone) {
    return <CompanionshipArStage result={result} mealPhotoId={mealPhotoId} onDone={() => setIsArDone(true)} />;
  }
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }]}>
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">{t("Battle.resultTitle")}</Text>
        <Text style={styles.body}>
          {result.acquiredCharacter
            ? t("Battle.resultCompanion", { name: result.acquiredCharacter.name })
            : t(result.usedMealLog ? "Battle.resultNoCompanion" : "Battle.resultNoCompanionNoMeal")}
        </Text>
        {result.acquiredCharacter ? (
          <View style={styles.figure}>
            <PoopmFigure3D appearance={appearanceForCharacter(result.acquiredCharacter.id)} label={result.acquiredCharacter.name} style={styles.figureBox} />
          </View>
        ) : null}
      </View>
      <Button label={doneLabel} onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: spacing.md, backgroundColor: colors.background },
  card: { backgroundColor: colors.paperWhite, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  title: { fontFamily: fonts.black, fontSize: fontSize.title, color: colors.charcoal },
  body: { fontFamily: fonts.regular, fontSize: fontSize.body, lineHeight: 22, color: colors.charcoal },
  figure: { alignItems: "center", paddingTop: spacing.md },
  figureBox: { width: 160, height: 200 },
});
