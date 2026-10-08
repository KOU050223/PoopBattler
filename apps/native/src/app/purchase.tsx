import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  SIGNED_OUT_ACCOUNT_STATUS,
  type AccountStatus,
} from "@poopbattler/domain/account/account.types";

import { watchAccountStatus } from "@/features/account/account-watch";
import { accountGateway, iapGateway } from "@/features/gateways";
import { getSupabase } from "@/lib/supabase";
import { waitForEntitlement, type PurchaseOffer } from "@/features/billing/iap-gateway";
import { Button, cardStyle } from "@/features/records-ui";
import { colors, fonts, spacing } from "@/theme";

type LoadState = "loading" | "unavailable" | "error" | "ready" | "empty";

function periodKey(period: string | null): string | null {
  switch (period) {
    case "P1W": return "Billing.periodWeekly";
    case "P1M": return "Billing.periodMonthly";
    case "P1Y": return "Billing.periodYearly";
    default: return null;
  }
}

/**
 * 購入画面。offering の取得・購入・復元は iap-gateway 経由で、
 * 権利の反映は RevenueCat webhook → subscriptions を待つ
 * （native から subscriptions には書かない）。
 *
 * 匿名・Google未連携の人には購入ではなく連携への導線を出す
 * （web の PurchaseCallToAction と同じ考え方）。復元だけは残す。
 */
export default function PurchaseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [account, setAccount] = useState<AccountStatus>(SIGNED_OUT_ACCOUNT_STATUS);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [offers, setOffers] = useState<PurchaseOffer[]>([]);
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reflected, setReflected] = useState(false);

  useEffect(() => {
    const stop = watchAccountStatus(getSupabase().auth, setAccount);
    void (async () => {
      const result = await iapGateway().getPackages();
      if (result.status === "ok") {
        setOffers(result.offers);
        setLoadState(result.offers.length > 0 ? "ready" : "empty");
      } else if (result.status === "unavailable") {
        setLoadState("unavailable");
      } else {
        setLoadState("error");
      }
    })();
    return stop;
  }, []);

  // webhook 同期を短く待つ。間に合わなくても購入自体は成立しているので、
  // 「数秒かかる」案内を出すだけに留める。
  const waitAndReflect = useCallback(async () => {
    setMessage(t("Billing.reflecting"));
    const ok = await waitForEntitlement(async () => {
      try {
        const snapshot = await accountGateway().getSubscriptionSnapshot();
        return snapshot.status === "subscribed";
      } catch {
        return false;
      }
    });
    setReflected(ok);
    return ok;
  }, [t]);

  const buy = async (offer: PurchaseOffer) => {
    setBusy("buy");
    setMessage(null);
    setReflected(false);
    try {
      const outcome = await iapGateway().purchase(offer.identifier);
      if (outcome.status === "purchased") {
        const ok = await waitAndReflect();
        if (!ok) setMessage(t("Billing.purchased"));
      } else if (outcome.status === "cancelled") {
        // ユーザーが閉じただけ。案内は出さない。
      } else {
        setMessage(t("Billing.failed"));
      }
    } catch {
      setMessage(t("Billing.failed"));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy("restore");
    setMessage(null);
    setReflected(false);
    try {
      const outcome = await iapGateway().restore();
      if (outcome.status === "restored") {
        const ok = await waitAndReflect();
        if (!ok) setMessage(t("Billing.restored"));
      } else if (outcome.status === "not-found") {
        setMessage(t("Billing.restoreNotFound"));
      } else {
        setMessage(t("Billing.failed"));
      }
    } catch {
      setMessage(t("Billing.failed"));
    } finally {
      setBusy(null);
    }
  };

  const needsLink = !account.signedIn || account.isAnonymous || !account.hasGoogleIdentity;
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/report");
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={t("AccountMenu.cancel")} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.charcoal} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">{t("Billing.purchaseTitle")}</Text>
      </View>
      <Text style={styles.lead}>{t("Billing.purchaseDescription")}</Text>

      {reflected ? (
        <View style={[styles.card, styles.reflectedCard]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.flushEdge} />
          <Text style={styles.cardText}>{t("Billing.reflected")}</Text>
          <View style={styles.buttonColumn}>
            <Button
              label={t("Billing.openReport")}
              onPress={() => router.replace("/(tabs)/report")}
            />
          </View>
        </View>
      ) : needsLink ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("Report.linkRequiredTitle")}</Text>
          <Text style={styles.cardText}>{t("Report.linkRequiredDescription")}</Text>
          <View style={styles.buttonColumn}>
            <Button
              label={t("Report.linkAccount")}
              onPress={() => router.push("/(tabs)/account")}
              icon={<Ionicons name="link" size={16} color={colors.paperWhite} />}
            />
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          {loadState === "loading" ? (
            <ActivityIndicator color={colors.flushEdge} style={styles.loader} />
          ) : loadState === "unavailable" ? (
            <Text style={styles.cardText}>{t("Billing.unavailable")}</Text>
          ) : loadState === "error" ? (
            <Text style={styles.cardText}>{t("Billing.failed")}</Text>
          ) : loadState === "empty" ? (
            <Text style={styles.cardText}>{t("Billing.noOffers")}</Text>
          ) : (
            offers.map((offer) => (
              <View key={offer.identifier} style={styles.offerRow}>
                <View style={styles.offerText}>
                  <Text style={styles.offerTitle} numberOfLines={2}>{offer.title}</Text>
                  <Text style={styles.offerPrice}>
                    {offer.priceString}
                    {periodKey(offer.subscriptionPeriod) ? ` / ${t(periodKey(offer.subscriptionPeriod)!)}` : ""}
                  </Text>
                </View>
                <View style={styles.offerButton}>
                  <Button
                    label={busy === "buy" ? t("Billing.purchasing") : t("Billing.buy")}
                    onPress={() => void buy(offer)}
                    disabled={busy !== null}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.restoreRow}>
        {busy === "restore" ? (
          <ActivityIndicator color={colors.flushEdge} />
        ) : (
          <Button
            label={t("Billing.restore")}
            onPress={() => void restore()}
            disabled={busy !== null}
            variant="secondary"
          />
        )}
      </View>

      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>
      ) : null}

      <Text style={styles.note}>{t("Billing.autoRenewNote")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -spacing.sm },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.charcoal, letterSpacing: -0.5 },
  lead: { fontFamily: fonts.regular, fontSize: 14, color: colors.pencilGray, marginTop: 4, marginBottom: spacing.lg },
  card: { ...cardStyle, padding: spacing.lg },
  reflectedCard: { alignItems: "center", gap: spacing.sm },
  cardTitle: { fontFamily: fonts.black, fontSize: 17, color: colors.charcoal },
  cardText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.pencilGray, marginTop: spacing.sm },
  loader: { alignSelf: "flex-start" },
  offerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  offerText: { flex: 1, minWidth: 0 },
  offerTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.charcoal },
  offerPrice: { fontFamily: fonts.regular, fontSize: 13, color: colors.pencilGray, marginTop: 2 },
  offerButton: { minWidth: 120 },
  buttonColumn: { marginTop: spacing.md, alignSelf: "stretch" },
  restoreRow: { marginTop: spacing.lg, alignSelf: "stretch" },
  message: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.charcoal, marginTop: spacing.md },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.pencilGray, marginTop: spacing.lg },
});
