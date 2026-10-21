import Ionicons from "@expo/vector-icons/Ionicons";
import * as Linking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  SIGNED_OUT_ACCOUNT_STATUS,
  type AccountStatus,
} from "@poopbattler/domain/account/account.types";

import { Button, cardStyle } from "@/components/ui";
import { accountGateway, iapGateway } from "@/gateways";
import { getSupabase } from "@/lib/supabase";
import { runGoogleOAuthFlow, type GoogleAuthFailureReason } from "@/features/account/google-identity";
import { waitForEntitlement } from "@/features/billing/iap-gateway";
import type { SubscriptionSnapshot } from "@/features/billing/subscription-status";
import { formatJstDate } from "@/features/report/report-format";
import { colors, fonts, spacing } from "@/theme";

import { watchAccountStatus } from "../account-watch";

// openAuthSessionAsync はこのスキームへの遷移を捕まえる。dev build では
// poopbattler://auth/callback になる（app.json の scheme 済み）。
const redirectTo = Linking.createURL("auth/callback");

const GOOGLE_ERROR_KEYS: Record<GoogleAuthFailureReason, string> = {
  identity_already_exists: "Account.conflict",
  manual_linking_disabled: "Account.manualLinkingDisabled",
  validation_failed: "Account.validationFailed",
  "no-url": "Account.linkFailed",
  "unexpected-redirect": "Account.linkFailed",
  unknown: "Account.linkFailed",
};

export function AccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<AccountStatus>(SIGNED_OUT_ACCOUNT_STATUS);
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);

  useEffect(() => watchAccountStatus(getSupabase().auth, setStatus), []);

  const reloadSnapshot = useCallback(async () => {
    setSnapshot(await accountGateway().getSubscriptionSnapshot());
    setSnapshotLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadSnapshot();
    }, [reloadSnapshot]),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text style={styles.title} accessibilityRole="header">{t("Pages.account.title")}</Text>
      <Text style={styles.lead}>{t("Pages.account.description")}</Text>

      <GoogleLinkCard status={status} onLinked={setStatus} />
      <PremiumCard
        snapshot={snapshot}
        loaded={snapshotLoaded}
        onChanged={reloadSnapshot}
      />
      <DeleteCard />
    </ScrollView>
  );
}

/**
 * Google 連携と再ログイン。web の GoogleAccountLink と同じ判断:
 * - 匿名ユーザーのみに消失警告と連携ボタンを出す
 * - 連携済みなら連携中のメールを出す
 * - 「以前連携した記録に戻る」は誤タップで今のアカウントを捨てるため
 *   二段階確認にする
 */
function GoogleLinkCard({ status, onLinked }: {
  status: AccountStatus;
  onLinked: (status: AccountStatus) => void;
}) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<"link" | "sign-in" | null>(null);
  const [confirmingSignIn, setConfirmingSignIn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (kind: "link" | "sign-in") => {
    setPending(kind);
    setMessage(null);
    try {
      const outcome = await runGoogleOAuthFlow(
        getSupabase().auth,
        WebBrowser.openAuthSessionAsync,
        redirectTo,
        kind,
      );
      if (outcome.status === "ok") {
        onLinked(outcome.account);
        setMessage(t("Account.linkDone"));
        setConfirmingSignIn(false);
      } else if (outcome.status === "error") {
        setMessage(t(GOOGLE_ERROR_KEYS[outcome.reason]));
      }
    } catch {
      setMessage(t("Account.linkFailed"));
    } finally {
      setPending(null);
    }
  };

  if (!status.signedIn) return null;

  // 匿名でない利用者（メール等で昇格済み）に消失の警告は出さない。
  // web と同じく、この場合はカードごと出さない。
  if (!status.isAnonymous && !status.hasGoogleIdentity) return null;

  if (status.hasGoogleIdentity) {
    return (
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.flushEdge} />
          <Text style={styles.cardTitle}>{t("Account.linkedTitle")}</Text>
        </View>
        <Text style={styles.cardNote}>
          {status.email
            ? t("Account.linkedDescription", { email: status.email })
            : t("Account.linkedDescriptionNoEmail")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.warnCard]}>
      <Text style={styles.cardTitle}>{t("Account.anonymousTitle")}</Text>
      <Text style={styles.cardNote}>{t("Account.anonymousWarning")}</Text>

      <View style={styles.buttonColumn}>
        <Button
          label={pending === "link" ? t("Account.working") : t("Account.link")}
          onPress={() => void run("link")}
          disabled={pending !== null}
          icon={<Ionicons name="logo-google" size={16} color={colors.paperWhite} />}
        />
      </View>

      {confirmingSignIn ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>{t("Account.signInWarning")}</Text>
          <View style={styles.buttonColumn}>
            <Button
              label={pending === "sign-in" ? t("Account.working") : t("Account.signIn")}
              onPress={() => void run("sign-in")}
              disabled={pending !== null}
            />
            <Button
              label={t("Account.cancel")}
              onPress={() => setConfirmingSignIn(false)}
              disabled={pending !== null}
              variant="secondary"
            />
          </View>
        </View>
      ) : (
        <View style={styles.buttonColumn}>
          <Button
            label={t("Account.returnToLinked")}
            onPress={() => setConfirmingSignIn(true)}
            disabled={pending !== null}
            variant="secondary"
          />
        </View>
      )}

      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>
      ) : null}
    </View>
  );
}

/**
 * 購読状態と、購入/復元への導線。
 *
 * 解約や支払い方法の管理は App Store 側で行うため、ここにはポータルも
 * 解約ボタンも置かない（Apple 管理の案内だけ出す）。
 */
function PremiumCard({ snapshot, loaded, onChanged }: {
  snapshot: SubscriptionSnapshot | null;
  loaded: boolean;
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const restore = async () => {
    setRestoring(true);
    setNotice(null);
    try {
      const outcome = await iapGateway().restore();
      if (outcome.status === "restored") {
        setNotice(t("Billing.reflecting"));
        // 権利の本体は RevenueCat webhook → subscriptions。ここでは
        // 反映を短く待ち、間に合わなくても案内だけ残す。
        const reflected = await waitForEntitlement(async () => {
          const next = await accountGateway().getSubscriptionSnapshot();
          return next.status === "subscribed";
        });
        await onChanged();
        setNotice(t(reflected ? "Billing.reflected" : "Billing.restored"));
      } else if (outcome.status === "not-found") {
        setNotice(t("Billing.restoreNotFound"));
      } else {
        setNotice(t("Billing.failed"));
      }
    } catch {
      setNotice(t("Billing.failed"));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <Ionicons name="star" size={18} color={colors.flushEdge} />
        <Text style={styles.cardTitle}>{t("Billing.premiumTitle")}</Text>
      </View>

      {!loaded || snapshot === null ? (
        <ActivityIndicator color={colors.flushEdge} style={styles.loader} />
      ) : snapshot.status === "subscribed" ? (
        <View>
          <Text style={styles.cardNote}>{t("Billing.subscribedTitle")}</Text>
          {snapshot.cancelAtPeriodEnd && snapshot.periodEnd ? (
            <Text style={styles.cardNote}>
              {t("Billing.scheduledUntil", { date: formatJstDate(snapshot.periodEnd) })}
            </Text>
          ) : null}
          {snapshot.provider === "apple" ? (
            <Text style={styles.cardNote}>{t("Billing.appleManaged")}</Text>
          ) : null}
        </View>
      ) : snapshot.status === "lapsed" ? (
        <View>
          <Text style={styles.cardTitle}>{t("Billing.lapsedTitle")}</Text>
          <Text style={styles.cardNote}>
            {t(snapshot.provider === "apple" ? "Billing.lapsedApple" : "Billing.lapsedOther")}
          </Text>
        </View>
      ) : snapshot.status === "not-subscribed" ? (
        <View>
          <Text style={styles.cardNote}>{t("Billing.notSubscribed")}</Text>
          <View style={styles.buttonColumn}>
            <Button
              label={t("Billing.goPurchase")}
              onPress={() => router.push("/purchase")}
              icon={<Ionicons name="sparkles" size={16} color={colors.paperWhite} />}
            />
          </View>
        </View>
      ) : (
        // unknown: 「未購読」と誤表示しないよう状態は出さない
        <Text style={styles.cardNote}>{t("Common.errorDescription")}</Text>
      )}

      {restoring ? (
        <ActivityIndicator color={colors.flushEdge} style={styles.loader} />
      ) : (
        <View style={styles.buttonColumn}>
          <Button label={t("Billing.restore")} onPress={() => void restore()} variant="secondary" />
        </View>
      )}

      {notice ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">{notice}</Text>
      ) : null}
    </View>
  );
}

function DeleteCard() {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={[styles.cardTitle, { color: colors.dangerEdge }]}>{t("Account.deleteTitle")}</Text>
      {/* web と同じサーバーサイド削除経路は native から叩ける API として
          まだ存在しないため、ここは準備中として残す。 */}
      <Text style={styles.cardNote}>{t("Account.deleteUnavailable")}</Text>
      <View style={styles.disabledButton}>
        <Text style={styles.disabledButtonText}>{t("Account.deletePending")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.charcoal, letterSpacing: -0.5 },
  lead: { fontFamily: fonts.regular, fontSize: 14, color: colors.pencilGray, marginTop: 4, marginBottom: spacing.lg },
  card: { ...cardStyle, padding: spacing.lg, marginBottom: spacing.lg },
  warnCard: { borderColor: "#e0b23c" },
  cardTitle: { fontFamily: fonts.black, fontSize: 17, color: colors.charcoal, letterSpacing: -0.2 },
  cardNote: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.pencilGray, marginTop: spacing.sm },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  buttonColumn: { marginTop: spacing.md, gap: spacing.sm },
  confirmBox: {
    marginTop: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cottonPink,
    backgroundColor: colors.paperWhite,
    padding: spacing.md,
  },
  confirmText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.charcoal },
  loader: { marginTop: spacing.md, alignSelf: "flex-start" },
  message: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.charcoal, marginTop: spacing.md },
  disabledButton: {
    marginTop: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cottonPink,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  disabledButtonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.pencilGray },
});
