import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SIGNED_OUT_ACCOUNT_STATUS, type AccountStatus } from "@poopbattler/domain/account/account.types";

import { watchAccountStatus } from "@/features/account/account-watch";
import { EmptyState } from "@/components/ui";
import { reportGateway } from "@/gateways";
import { getSupabase } from "@/lib/supabase";
import { colors, fonts, spacing } from "@/theme";

import type { ReportResult } from "../report-gateway";
import { TeaserReport } from "./teaser-report";
import { WeeklyReportView } from "./weekly-report-view";

/**
 * レポート画面の本体。
 *
 * 権利の判定と取得列の切り分けは report-gateway 側。ここでは
 * 「非課金の結果に分析値が入らない」前提の上で表示だけを分岐する。
 * タブはマウントされ続けるため、フォーカスのたびに再読み込みする
 * （購入画面から戻ったときに権利が反映されているように）。
 */
export function ReportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [account, setAccount] = useState<AccountStatus>(SIGNED_OUT_ACCOUNT_STATUS);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => watchAccountStatus(getSupabase().auth, setAccount), []);

  const load = useCallback(async () => {
    try {
      setResult(await reportGateway().getWeeklyReport());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      {!loaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.flushEdge} />
        </View>
      ) : failed || result === null ? (
        <EmptyState title={t("Report.errorTitle")} description={t("Report.errorDescription")} />
      ) : result.entitled ? (
        <WeeklyReportView report={result.report} />
      ) : (
        <View>
          <TeaserHeader />
          <TeaserReport teaser={result.teaser} account={account} />
        </View>
      )}
    </ScrollView>
  );
}

function TeaserHeader() {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Text style={styles.premiumLabel}>{t("Report.premium")}</Text>
      <Text style={styles.title} accessibilityRole="header">{t("Report.title")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  loading: { paddingVertical: spacing.xxl, alignItems: "center" },
  header: { marginBottom: spacing.lg },
  premiumLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.charcoal, marginBottom: 4 },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.charcoal, letterSpacing: -0.5 },
});
