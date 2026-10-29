import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  SIGNED_OUT_ACCOUNT_STATUS,
  type AccountStatus,
} from "@poopbattler/domain/account/account.types";

import { watchAccountStatus } from "@/features/account/account-watch";
import { accountGateway, iapGateway } from "@/gateways";
import { getSupabase } from "@/lib/supabase";
import { waitForEntitlement, type PurchaseOffer } from "@/features/billing/iap-gateway";
import { colors, fontFamily, fontSize, spacing } from "@/design";
import { NoticeCard, ParentButton, ParentCard, ParentScreen } from "@/design/parent";

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
    else router.replace("/report");
  };

  const premiumIcon = <Ionicons name="ribbon-outline" size={22} color={colors.goldEdge} />;

  return (
    <ParentScreen title={t("Billing.purchaseTitle")} onBack={goBack}>
      <NoticeCard tone="gold" title={t("Billing.premiumTitle")} icon={premiumIcon}>
        <Text style={styles.lead}>{t("Billing.purchaseDescription")}</Text>
        {FEATURE_KEYS.map((key) => (
          <View key={key} style={styles.featureRow}>
            <Ionicons name="checkmark" size={18} color={colors.leaf} />
            <Text style={styles.featureText}>{t(key)}</Text>
          </View>
        ))}
      </NoticeCard>

      {reflected ? (
        <ParentCard>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t("Billing.reflected")}</Text>
            <ParentButton label={t("Billing.openReport")} variant="primary" onPress={() => router.replace("/report")} />
          </View>
        </ParentCard>
      ) : needsLink ? (
        <ParentCard>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t("Report.linkRequiredTitle")}</Text>
            <Text style={styles.cardText}>{t("Report.linkRequiredDescription")}</Text>
            <ParentButton
              label={t("Report.linkAccount")}
              variant="primary"
              onPress={() => router.push("/account")}
              icon={<Ionicons name="link" size={16} color={colors.paper} />}
            />
          </View>
        </ParentCard>
      ) : (
        <ParentCard>
          <View style={styles.cardBody}>
            {loadState === "loading" ? (
              <ActivityIndicator color={colors.pink} style={styles.loader} />
            ) : loadState === "unavailable" ? (
              <Text style={styles.cardText}>{t("Billing.unavailable")}</Text>
            ) : loadState === "error" ? (
              <Text style={styles.cardText}>{t("Billing.failed")}</Text>
            ) : loadState === "empty" ? (
              <Text style={styles.cardText}>{t("Billing.noOffers")}</Text>
            ) : (
              offers.map((offer) => (
                <View key={offer.identifier} style={styles.offer}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{offer.title}</Text>
                  <Text style={styles.price}>
                    {offer.priceString}
                    {periodKey(offer.subscriptionPeriod) ? <Text style={styles.period}>{` / ${t(periodKey(offer.subscriptionPeriod)!)}`}</Text> : null}
                  </Text>
                  <ParentButton
                    label={busy === "buy" ? t("Billing.purchasing") : t("Billing.buy")}
                    variant="primary"
                    onPress={() => void buy(offer)}
                    disabled={busy !== null}
                  />
                </View>
              ))
            )}
            {loadState === "ready" ? <Text style={styles.caption}>{t("Billing.priceNote")}</Text> : null}
          </View>
        </ParentCard>
      )}

      {busy === "restore" ? (
        <ActivityIndicator color={colors.pink} />
      ) : (
        <ParentButton label={t("Billing.restore")} onPress={() => void restore()} disabled={busy !== null} />
      )}

      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>
      ) : null}

      <Text style={styles.caption}>{t("Billing.autoRenewNote")}</Text>
    </ParentScreen>
  );
}

const FEATURE_KEYS = ["Billing.featureDaily", "Billing.featureCompare", "Billing.featureRatio"] as const;

const styles = StyleSheet.create({
  lead: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.body, lineHeight: 24, color: colors.ink },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  featureText: { flex: 1, fontFamily: fontFamily.jaMedium, fontSize: fontSize.body, color: colors.ink },
  cardBody: { padding: spacing.lg, gap: spacing.md },
  cardTitle: { fontFamily: fontFamily.jaBold, fontSize: fontSize.body, color: colors.ink },
  cardText: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.body, lineHeight: 24, color: colors.inkSoft },
  loader: { alignSelf: "flex-start" },
  offer: { gap: spacing.sm },
  price: { fontFamily: fontFamily.numExtraBold, fontSize: fontSize.title, color: colors.ink },
  period: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, color: colors.inkSoft },
  message: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, lineHeight: 19, color: colors.ink },
  caption: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, lineHeight: 19, color: colors.inkSoft },
});
