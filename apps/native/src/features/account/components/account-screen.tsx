import Ionicons from "@expo/vector-icons/Ionicons";
import * as Linking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  SIGNED_OUT_ACCOUNT_STATUS,
  type AccountStatus,
} from "@poopbattler/domain/account/account.types";

import { colors, fontFamily, fontSize, radius, spacing } from "@/design";
import { NoticeCard, ParentButton, ParentCard, ParentScreen } from "@/design/parent";
import { accountGateway, iapGateway } from "@/gateways";
import { getSupabase } from "@/lib/supabase";
import { runGoogleOAuthFlow, type GoogleAuthFailureReason } from "@/features/account/google-identity";
import { waitForEntitlement } from "@/features/billing/iap-gateway";
import type { SubscriptionSnapshot } from "@/features/billing/subscription-status";
import { formatJstDate } from "@/features/report/report-format";

import { watchAccountStatus } from "../account-watch";
import { planView } from "./plan-view";

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
  const router = useRouter();
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
    <ParentScreen title={t("Pages.account.title")} onBack={() => (router.canGoBack() ? router.back() : router.replace("/parent"))}>
      <GoogleLinkCard status={status} onLinked={setStatus} />
      <PremiumCard
        snapshot={snapshot}
        loaded={snapshotLoaded}
        onChanged={reloadSnapshot}
      />
      <DeleteCard />
    </ParentScreen>
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
      <NoticeCard
        tone="info"
        title={t("Account.linkedTitle")}
        icon={<Ionicons name="checkmark-circle" size={20} color={colors.sky} />}
      >
        <Text style={styles.cardNote}>
          {status.email
            ? t("Account.linkedDescription", { email: status.email })
            : t("Account.linkedDescriptionNoEmail")}
        </Text>
      </NoticeCard>
    );
  }

  return (
    <NoticeCard
      tone="warn"
      title={t("Account.anonymousTitle")}
      icon={<Ionicons name="warning-outline" size={20} color={colors.sunset} />}
    >
      <Text style={styles.cardNote}>{t("Account.anonymousWarning")}</Text>

      <ParentButton
        label={pending === "link" ? t("Account.working") : t("Account.link")}
        onPress={() => void run("link")}
        disabled={pending !== null}
        icon={<Ionicons name="logo-google" size={16} color={colors.ink} />}
      />

      {confirmingSignIn ? (
        <View style={styles.confirmBox}>
          <Text style={styles.cardNote}>{t("Account.signInWarning")}</Text>
          <ParentButton
            label={pending === "sign-in" ? t("Account.working") : t("Account.signIn")}
            onPress={() => void run("sign-in")}
            disabled={pending !== null}
          />
          <ParentButton
            label={t("Account.cancel")}
            onPress={() => setConfirmingSignIn(false)}
            disabled={pending !== null}
          />
        </View>
      ) : (
        <ParentButton
          label={t("Account.returnToLinked")}
          onPress={() => setConfirmingSignIn(true)}
          disabled={pending !== null}
        />
      )}

      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>
      ) : null}
    </NoticeCard>
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

  const view = planView(snapshot, loaded);

  return (
    <ParentCard>
      <View style={styles.cardBody}>
        <View style={styles.planRow}>
          <View style={styles.planText}>
            <Text style={styles.planLabel}>{t("Account.planLabel")}</Text>
            <Text style={styles.planName}>{t(view.nameKey)}</Text>
          </View>
          {view.canViewPlan ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/purchase")}
              style={({ pressed }) => [styles.planPill, pressed && styles.pressed]}
            >
              <Text style={styles.planPillText}>{t("Account.viewPlan")}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.goldEdge} />
            </Pressable>
          ) : null}
        </View>

        {view.body === "loading" || snapshot === null ? (
          <ActivityIndicator color={colors.pink} style={styles.loader} />
        ) : snapshot.status === "subscribed" ? (
          <View style={styles.notes}>
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
          <Text style={styles.cardNote}>
            {t(snapshot.provider === "apple" ? "Billing.lapsedApple" : "Billing.lapsedOther")}
          </Text>
        ) : snapshot.status === "not-subscribed" ? null : (
          // unknown: 「未購読」と誤表示しないよう状態は出さない
          <Text style={styles.cardNote}>{t("Common.errorDescription")}</Text>
        )}

        {restoring ? (
          <ActivityIndicator color={colors.pink} style={styles.loader} />
        ) : (
          <ParentButton label={t("Billing.restore")} onPress={() => void restore()} />
        )}

        {notice ? (
          <Text style={styles.message} accessibilityLiveRegion="polite">{notice}</Text>
        ) : null}
      </View>
    </ParentCard>
  );
}

function DeleteCard() {
  const { t } = useTranslation();
  return (
    <View style={styles.delete}>
      {/* web と同じサーバーサイド削除経路は native から叩ける API として
          まだ存在しないため、ここは準備中として残す。 */}
      <Text style={styles.cardNote}>{t("Account.deleteUnavailable")}</Text>
      <ParentButton variant="danger-text" label={t("Account.deleteAction")} onPress={() => {}} disabled />
      <Text style={styles.caption}>{t("Account.deletePending")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardBody: { padding: spacing.lg, gap: spacing.md },
  cardNote: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.body, lineHeight: 24, color: colors.ink },
  notes: { gap: spacing.sm },
  confirmBox: { borderRadius: radius.card / 2, backgroundColor: colors.paper, padding: spacing.md, gap: spacing.sm },
  loader: { alignSelf: "flex-start" },
  message: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, lineHeight: 19, color: colors.ink },
  planRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  planText: { flex: 1, minWidth: 0 },
  planLabel: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, color: colors.inkSoft },
  planName: { fontFamily: fontFamily.jaBold, fontSize: fontSize.title, color: colors.ink },
  planPill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: `${colors.gold}33` },
  planPillText: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.goldEdge },
  pressed: { opacity: 0.7 },
  delete: { marginTop: spacing.xl, alignItems: "center", gap: spacing.xs },
  caption: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, color: colors.inkSoft },
});
