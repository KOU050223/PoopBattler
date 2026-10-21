import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ATTRIBUTE_LABELS } from "@poopbattler/domain/battle/battle.constants";
import {
  BOWEL_AMOUNT_OPTIONS, BOWEL_COLOR_OPTIONS, BOWEL_EASE_OPTIONS, BOWEL_HARDNESS_OPTIONS, BOWEL_SYMPTOM_OPTIONS,
} from "@poopbattler/domain/records/bowel-log.types";
import { getMealFoodGroupLabel } from "@poopbattler/domain/records/meal.types";

import { colors, fontSize, fonts, radius, spacing } from "@/theme";

import { battleHistoryGateway } from "@/gateways";
import { cardStyle, Chip, dateFormatter, EmptyState } from "@/components/ui";
import { useLoader } from "@/hooks/use-loader";
import type { BattleHistoryLog } from "../battle-history-gateway";

const optionLabel = <T,>(options: readonly { value: T; label: string }[], value: T) =>
  options.find((option) => option.value === value)?.label ?? String(value);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Detail({ log, onClose }: { log: BattleHistoryLog | undefined; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!log} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {log ? (
        <View style={styles.detail}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle} accessibilityRole="header">{t("Records.battleWith", { name: log.enemy.name })}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("Records.close")}>
              <Ionicons name="close" size={26} color={colors.pencilGray} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={[styles.detailBody, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <Text style={styles.date}>{dateFormatter(i18n.language, log.completedAt)}</Text>
            <View style={styles.card}>
              <Row label={t("Records.attribute")} value={ATTRIBUTE_LABELS[log.enemy.attribute]} />
              <Row label={t("Records.recorded")} value={t(log.companionshipResult ? "Records.companion" : "Records.notCompanion")} />
              {log.mealFoodGroups ? <Row label={t("Records.trigger")} value={log.mealFoodGroups.map(getMealFoodGroupLabel).join("・")} /> : null}
            </View>
            <Text style={styles.section}>{t("Records.condition")}</Text>
            {log.bowelLog ? (
              <View style={styles.card}>
                <Row label={t("Records.hardness")} value={optionLabel(BOWEL_HARDNESS_OPTIONS, log.bowelLog.hardness)} />
                <Row label={t("Records.amount")} value={optionLabel(BOWEL_AMOUNT_OPTIONS, log.bowelLog.amount)} />
                <Row label={t("Records.color")} value={optionLabel(BOWEL_COLOR_OPTIONS, log.bowelLog.color)} />
                <Row label={t("Records.ease")} value={optionLabel(BOWEL_EASE_OPTIONS, log.bowelLog.ease)} />
                {log.bowelLog.symptoms && log.bowelLog.symptoms.length > 0 ? (
                  <View style={styles.symptoms}>
                    <Text style={styles.rowLabel}>{t("Records.symptoms")}</Text>
                    <View style={styles.chips}>
                      {log.bowelLog.symptoms.map((s) => <Chip key={s} label={optionLabel(BOWEL_SYMPTOM_OPTIONS, s)} />)}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.muted}>{t("Records.noCondition")}</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

export function BattleHistory({ bottomInset }: { bottomInset: number }) {
  const { t, i18n } = useTranslation();
  const { data, error, loading, reload } = useLoader(() => battleHistoryGateway().getBattleHistory());
  const [selected, setSelected] = useState<BattleHistoryLog>();

  return (
    <>
      <FlatList
        data={data ?? []}
        keyExtractor={(log) => log.battleId}
        refreshing={loading}
        onRefresh={() => void reload()}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset + spacing.xxl }]}
        ListHeaderComponent={error ? <Text style={styles.error} accessibilityRole="alert">{t("Records.loadFailed")}</Text> : null}
        ListEmptyComponent={loading || error ? null : <EmptyState title={t("Records.noBattles")} description={t("Records.noBattlesHint")} />}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => setSelected(item)} style={({ pressed }) => [styles.card, styles.item, pressed && { opacity: 0.8 }]}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle} numberOfLines={1}>{t("Records.battleWith", { name: item.enemy.name })}</Text>
              <Text style={styles.muted}>{dateFormatter(i18n.language, item.completedAt)}</Text>
              <View style={styles.chips}>
                <Chip label={ATTRIBUTE_LABELS[item.enemy.attribute]} />
                <Chip label={t(item.companionshipResult ? "Records.companion" : "Records.notCompanion")} selected={item.companionshipResult} />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.fadedGray} />
          </Pressable>
        )}
      />
      <Detail log={selected} onClose={() => setSelected(undefined)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  list: { gap: spacing.md },
  card: { ...cardStyle, padding: spacing.md, gap: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 72 },
  itemTitle: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.charcoal },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.pencilGray },
  error: { fontFamily: fonts.bold, fontSize: 13, color: colors.dangerEdge },
  detail: { flex: 1, backgroundColor: colors.background },
  detailHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, padding: spacing.lg },
  detailTitle: { flex: 1, fontFamily: fonts.black, fontSize: 20, color: colors.charcoal },
  detailBody: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  date: { fontFamily: fonts.regular, fontSize: 14, color: colors.pencilGray },
  section: { fontFamily: fonts.bold, fontSize: 16, color: colors.charcoal, marginTop: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  rowLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.pencilGray },
  rowValue: { flexShrink: 1, textAlign: "right", fontFamily: fonts.bold, fontSize: 14, color: colors.charcoal, borderRadius: radius.md },
  symptoms: { gap: spacing.xs },
});
