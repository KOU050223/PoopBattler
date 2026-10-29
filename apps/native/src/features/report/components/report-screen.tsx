import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { SIGNED_OUT_ACCOUNT_STATUS, type AccountStatus } from "@poopbattler/domain/account/account.types";

import { watchAccountStatus } from "@/features/account/account-watch";
import { colors, fontFamily, fontSize, spacing } from "@/design";
import { NoticeCard, ParentScreen } from "@/design/parent";
import { reportGateway } from "@/gateways";
import { getSupabase } from "@/lib/supabase";

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
  const router = useRouter();
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
    <ParentScreen
      title={t("Report.title")}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/parent"))}
    >
      {!loaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.inkSoft} />
        </View>
      ) : failed || result === null ? (
        <NoticeCard tone="warn" title={t("Report.errorTitle")}>
          <Text style={styles.errorDescription}>{t("Report.errorDescription")}</Text>
        </NoticeCard>
      ) : result.entitled ? (
        <WeeklyReportView report={result.report} />
      ) : (
        <TeaserReport teaser={result.teaser} account={account} />
      )}
    </ParentScreen>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing.xxl, alignItems: "center" },
  errorDescription: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, lineHeight: 19, color: colors.inkSoft },
});
