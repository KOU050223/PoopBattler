import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { isBattleGoneMessage } from "@poopbattler/domain/battle/complete-battle-error";
import type { BowelLog } from "@poopbattler/domain/records/bowel-log.types";

import { getSupabase } from "@/lib/supabase";
import { colors, elevation, fontSize, fonts, radius, spacing } from "@/theme";

import { completeBattleForSession, type CompleteBattleResult } from "../supabase-gateway";
import { BowelForm } from "./bowel-form";
import { Button } from "./ui";

type Completed = Extract<CompleteBattleResult, { success: true }>;

/** 完了結果 + 投げ入れ演出に使う食事写真（この回の最後の記録。未記録なら null）。 */
export type BattleCompletedPayload = {
  result: Completed;
  mealPhotoId: string | null;
};

type BattleCompletionFlowProps = {
  battleId: string;
  onCompleted: (payload: BattleCompletedPayload) => void;
  onAbandon: () => void;
};

/**
 * 勝利後の完了フロー。排便ログを送ったら、食事の画面を挟まずにそのまま結果を確定する。
 * 食事の記録は別の入口（meals 画面）で行う。
 */
export function BattleCompletionFlow({ battleId, onCompleted, onAbandon }: BattleCompletionFlowProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const submittingRef = useRef(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (bowelLog: BowelLog) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setCompleting(true);
    setError(null);
    try {
      const result = await completeBattleForSession(getSupabase(), { battleId, bowelLog, sessionMealLogIds: [] });
      if (!result.success) {
        setError(result.message);
        return;
      }
      onCompleted({ result, mealPhotoId: null });
    } catch {
      setError(t("Battle.completeError"));
    } finally {
      submittingRef.current = false;
      setCompleting(false);
    }
  };

  const pad = { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[pad, styles.gap, styles.scrollBottom]} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">{t("Battle.completeTitle")}</Text>
        <Text style={styles.body}>{t("Battle.completeBody")}</Text>
      </View>
      <BowelForm submitting={completing} onSubmit={(log) => void finish(log)} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {error && isBattleGoneMessage(error) ? <Button label={t("Battle.abandon")} variant="secondary" onPress={onAbandon} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  gap: { gap: spacing.md },
  scrollBottom: { paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.paperWhite, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, ...elevation.card },
  title: { fontFamily: fonts.black, fontSize: fontSize.title, color: colors.charcoal },
  body: { fontFamily: fonts.regular, fontSize: fontSize.body, lineHeight: 22, color: colors.charcoal },
  error: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.dangerEdge },
});
