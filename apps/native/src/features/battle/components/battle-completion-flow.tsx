import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { isBattleGoneMessage } from "@poopbattler/domain/battle/complete-battle-error";
import {
  lastSessionPhotoId,
  postBattleCompleteLabel,
  postBattleMealChanceCopy,
} from "@poopbattler/domain/battle/post-battle-meal-session";
import type { BowelLog } from "@poopbattler/domain/records/bowel-log.types";
import { getMealFoodGroupLabel } from "@poopbattler/domain/records/meal.types";

import { getSupabase } from "@/lib/supabase";
import { colors, elevation, fontSize, fonts, radius, spacing } from "@/theme";

import { mealGateway } from "@/gateways";
import { MealLogForm } from "../../meal/components/meal-log-form";
import type { MealLog } from "../../meal/meal-gateway";
import { dateFormatter } from "@/components/ui";
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
 * 勝利後の完了フロー。web の BattleCompletionFlow と同じ遷移:
 * 排便ログ → 食事記録セッション（任意・何件でも）→ 結果確定。
 * 排便ログは完了までクライアントに保持し、食事セッションの完了で一括確定する。
 */
export function BattleCompletionFlow({ battleId, onCompleted, onAbandon }: BattleCompletionFlowProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const submittingRef = useRef(false);
  const [bowelLog, setBowelLog] = useState<BowelLog | null>(null);
  const [sessionLogs, setSessionLogs] = useState<MealLog[]>([]);
  const [existingMealLogCount, setExistingMealLogCount] = useState(0);
  const [mealFormVisible, setMealFormVisible] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 確率案内の母数。読めなくても記録・完了はできるので失敗は握りつぶす。
  useEffect(() => {
    let alive = true;
    void mealGateway().getMealLogs()
      .then((logs) => {
        if (alive) setExistingMealLogCount(logs.length);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const finish = async () => {
    if (!bowelLog || submittingRef.current) return;
    submittingRef.current = true;
    setCompleting(true);
    setError(null);
    try {
      const result = await completeBattleForSession(getSupabase(), {
        battleId,
        bowelLog,
        sessionMealLogIds: sessionLogs.map((log) => log.id),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      onCompleted({ result, mealPhotoId: lastSessionPhotoId(sessionLogs) });
    } catch {
      setError(t("Battle.completeError"));
    } finally {
      submittingRef.current = false;
      setCompleting(false);
    }
  };

  const pad = { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg };

  if (!bowelLog) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[pad, styles.gap, styles.scrollBottom]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">{t("Battle.completeTitle")}</Text>
          <Text style={styles.body}>{t("Battle.completeBody")}</Text>
        </View>
        <BowelForm submitting={false} onSubmit={setBowelLog} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {error && isBattleGoneMessage(error) ? <Button label={t("Battle.abandon")} variant="secondary" onPress={onAbandon} /> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[pad, styles.gap, styles.scrollBottom]} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">{t("Battle.mealBoostTitle")}</Text>
        <Text style={styles.body}>{postBattleMealChanceCopy(existingMealLogCount, sessionLogs.length)}</Text>
      </View>
      {sessionLogs.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>{t("Battle.sessionMeals")}</Text>
            <Text style={styles.caption}>{t("Records.count", { count: sessionLogs.length })}</Text>
          </View>
          {sessionLogs.map((log) => (
            <View key={log.id} style={styles.sessionRow}>
              <Text style={styles.sessionFoods}>{log.foodGroups.map(getMealFoodGroupLabel).join("・")}</Text>
              <Text style={styles.caption}>{dateFormatter(i18n.language, log.eatenAt)}</Text>
            </View>
          ))}
          <Text style={styles.hint}>{t("Battle.sessionMealsHint")}</Text>
        </View>
      ) : null}
      <Button variant="secondary" label={t("Records.addMeal")} onPress={() => setMealFormVisible(true)} />
      <Button
        label={completing ? t("Battle.submitting") : postBattleCompleteLabel(sessionLogs.length)}
        disabled={completing}
        onPress={() => void finish()}
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {error && isBattleGoneMessage(error) ? <Button label={t("Battle.abandon")} variant="secondary" onPress={onAbandon} /> : null}
      <MealLogForm
        visible={mealFormVisible}
        onClose={() => setMealFormVisible(false)}
        onSaved={(log) => setSessionLogs((current) => [...current, log])}
      />
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
  hint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.pencilGray },
  caption: { fontFamily: fonts.bold, fontSize: 12, color: colors.pencilGray },
  error: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.dangerEdge },
  sessionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  sessionTitle: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.charcoal },
  sessionRow: { gap: 2 },
  sessionFoods: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.charcoal },
});
