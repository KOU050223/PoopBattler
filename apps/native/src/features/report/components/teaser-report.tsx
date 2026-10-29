import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import type { AccountStatus } from "@poopbattler/domain/account/account.types";
import { weekdayShortLabel, type Weekday } from "@poopbattler/domain/report/report-labels";
import { createTeaserPlaceholder } from "@poopbattler/domain/report/teaser-placeholder";

import { colors, fontFamily, fontSize, spacing } from "@/design";
import { NoticeCard, ParentButton, ParentCard } from "@/design/parent";

import type { ReportTeaser } from "../report-gateway";
import { DailyBarChart } from "./charts";

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SAMPLE_COUNT_INDEX = 0;
const SAMPLE_RATE_INDEX = 3;

/**
 * 非課金ユーザーへ見せるレポート。
 *
 * 見本として描いているのは domain の teaser-placeholder が作るダミー値で、
 * その人の記録ではない。「実データをぼかす」形にしない — 件数と記録日数
 * だけが実値で、それ以外はプレースホルダー文字列そのものを表示する。
 */
export function TeaserReport({ teaser, account }: { teaser: ReportTeaser; account: AccountStatus }) {
  const { t } = useTranslation();
  const placeholder = createTeaserPlaceholder(teaser.bowelCount);
  const sampleBars = WEEKDAYS.map((weekday, index) => ({
    key: weekday,
    label: weekdayShortLabel(weekday),
    count: placeholder.weekdayCounts[index] ?? 0,
  }));

  return (
    <>
      <ParentCard>
        <View style={styles.cardBody}>
          <Text style={styles.heading}>{t("Report.recordedCount", { count: teaser.bowelCount })}</Text>
          <Text style={styles.description}>{t("Report.recordedDays", { count: teaser.recordedDays })}</Text>
        </View>
      </ParentCard>

      {/* 見本であることを必ず読める位置に置く */}
      <ParentCard>
        <View style={styles.cardBody}>
          <View style={styles.sampleBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.goldEdge} />
            <Text style={styles.sampleBadgeText}>{t("Report.teaserSampleLabel")}</Text>
          </View>
          {/* RN に CSS blur は無いため、ダミー値を薄く表示して「見本」の見た目にする。実値ではないので読めても問題ない。 */}
          <View style={styles.sampleBody} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.sampleStats}>
              <SampleStat label={t("Report.statCount")} value={placeholder.metrics[SAMPLE_COUNT_INDEX]?.value ?? ""} />
              <SampleStat label={t("Report.statWellFormed")} value={placeholder.metrics[SAMPLE_RATE_INDEX]?.value ?? ""} />
            </View>
            <DailyBarChart items={sampleBars} accessibilityLabel="" />
          </View>
        </View>
      </ParentCard>

      <NoticeCard tone="gold" title={t("Report.lockedTitle")} icon={<Ionicons name="sparkles" size={20} color={colors.goldEdge} />}>
        <Text style={styles.description}>{t("Report.lockedDescription")}</Text>
        <PurchaseCallToAction account={account} />
      </NoticeCard>
    </>
  );
}

function SampleStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sampleStat}>
      <Text style={styles.sampleStatLabel}>{label}</Text>
      <Text style={styles.sampleStatValue}>{value}</Text>
    </View>
  );
}

/**
 * 購入への導線。
 *
 * 匿名・Google未連携の人には購入ボタンではなく連携への導線を出す。
 * 連携しないと別端末で購入を復元できないため、先にアカウント画面へ送る。
 */
function PurchaseCallToAction({ account }: { account: AccountStatus }) {
  const { t } = useTranslation();
  const router = useRouter();

  if (account.isAnonymous || !account.hasGoogleIdentity) {
    return (
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>{t("Report.linkRequiredTitle")}</Text>
        <Text style={styles.description}>{t("Report.linkRequiredDescription")}</Text>
        <ParentButton
          label={t("Report.linkAccount")}
          variant="primary"
          onPress={() => router.push("/account")}
          icon={<Ionicons name="link" size={16} color={colors.paper} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.cta}>
      <ParentButton
        label={t("Report.purchase")}
        variant="primary"
        onPress={() => router.push("/purchase")}
        icon={<Ionicons name="sparkles" size={16} color={colors.paper} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  heading: { fontFamily: fontFamily.jaBold, fontSize: fontSize.body, color: colors.ink },
  description: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.caption, lineHeight: 19, color: colors.inkSoft },
  sampleBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs },
  sampleBadgeText: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.goldEdge },
  sampleBody: { opacity: 0.45, gap: spacing.lg, marginTop: spacing.sm },
  sampleStats: { flexDirection: "row", gap: spacing.lg },
  sampleStat: { gap: spacing.xs },
  sampleStatLabel: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.inkSoft },
  sampleStatValue: { fontFamily: fontFamily.numExtraBold, fontSize: fontSize.childTitle, color: colors.ink },
  cta: { gap: spacing.md, marginTop: spacing.sm },
  ctaTitle: { fontFamily: fontFamily.jaBold, fontSize: fontSize.caption, color: colors.ink },
});
