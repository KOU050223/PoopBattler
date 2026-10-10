import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import type { AccountStatus } from "@poopbattler/domain/account/account.types";
import { BOWEL_COLOR_LABELS, weekdayShortLabel, type BowelColor, type Weekday } from "@poopbattler/domain/report/report-labels";
import { createTeaserPlaceholder } from "@poopbattler/domain/report/teaser-placeholder";

import { Button, cardStyle } from "@/features/records-ui";
import { colors, fonts, spacing } from "@/theme";

import type { ReportTeaser } from "../report-gateway";
import { BarChart, ShareBar, TrendLine } from "./charts";

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME_OF_DAY_KEYS = ["morning", "afternoon", "evening", "night"] as const;
const TIME_OF_DAY_COLORS = ["#ffd28f", colors.flushPink, colors.flushEdge, colors.nightInk];

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

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <View style={styles.countRow}>
          <View style={styles.countIcon}>
            <Ionicons name="calendar" size={20} color={colors.flushEdge} />
          </View>
          <View style={styles.countText}>
            <Text style={styles.cardHeading}>{t("Report.recordedCount", { count: teaser.bowelCount })}</Text>
            <Text style={styles.cardSub}>{t("Report.recordedDays", { count: teaser.recordedDays })}</Text>
          </View>
        </View>
      </View>

      {/* 見本であることを必ず読める位置に置く */}
      <View style={styles.card}>
        <View style={styles.sampleBadge}>
          <Ionicons name="lock-closed" size={12} color={colors.flushEdge} />
          <Text style={styles.sampleBadgeText}>{t("Report.teaserSampleLabel")}</Text>
        </View>
        {/* RN に CSS blur は無いため、ダミー値を薄く表示して「見本」の
            見た目にする。実値ではないので読めても問題ない。 */}
        <View
          style={styles.sampleBody}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <SamplePreview placeholder={placeholder} />
        </View>
      </View>

      <View style={[styles.card, styles.lockedCard]}>
        <View style={styles.lockedIcon}>
          <Ionicons name="sparkles" size={20} color={colors.paperWhite} />
        </View>
        <Text style={styles.lockedTitle}>{t("Report.lockedTitle")}</Text>
        <Text style={styles.lockedDescription}>{t("Report.lockedDescription")}</Text>
        <PurchaseCallToAction account={account} />
      </View>
    </View>
  );
}

/**
 * 購入への導線。
 *
 * 匿名・Google未連携の人には購入ボタンではなく連携への導線を出す
 * （web の PurchaseCallToAction と同じ判断）。連携しないと別端末で
 * 購入を復元できないため、先にアカウント画面へ送る。
 */
function PurchaseCallToAction({ account }: { account: AccountStatus }) {
  const { t } = useTranslation();
  const router = useRouter();

  if (account.isAnonymous || !account.hasGoogleIdentity) {
    return (
      <View style={styles.ctaBlock}>
        <Text style={styles.ctaTitle}>{t("Report.linkRequiredTitle")}</Text>
        <Text style={styles.ctaDescription}>{t("Report.linkRequiredDescription")}</Text>
        <View style={styles.ctaButton}>
          <Button
            label={t("Report.linkAccount")}
            onPress={() => router.push("/account")}
            icon={<Ionicons name="link" size={16} color={colors.paperWhite} />}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.ctaButton}>
      <Button
        label={t("Report.purchase")}
        onPress={() => router.push("/purchase")}
        icon={<Ionicons name="sparkles" size={16} color={colors.paperWhite} />}
      />
    </View>
  );
}

/** ぼかしの下に敷く見本。実データは受け取らない。 */
function SamplePreview({ placeholder }: { placeholder: ReturnType<typeof createTeaserPlaceholder> }) {
  const { t } = useTranslation();
  const metricLabels = [t("Report.bowelCount"), t("Report.recordDays"), t("Report.averageHardness"), t("Report.stableRate")];

  return (
    <View style={styles.sampleStack}>
      <View>
        <Text style={styles.cardHeading}>{t("Report.highlights")}</Text>
        <View style={styles.metricGrid}>
          {metricLabels.map((label, index) => (
            <View key={label} style={styles.metric}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{placeholder.metrics[index]?.value}</Text>
              <Text style={styles.metricDetail}>{placeholder.metrics[index]?.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.cardHeading}>{t("Report.hardnessTitle")}</Text>
        <BarChart
          label={t("Report.recordsByHardness")}
          emptyLabel={t("Report.noRecords")}
          bars={placeholder.hardnessCounts.map((count, index) => ({
            label: String(index + 1),
            value: count,
            highlighted: index + 1 >= 3 && index + 1 <= 5,
          }))}
        />
      </View>

      <View>
        <Text style={styles.groupHeading}>{t("Report.amount")}</Text>
        <ShareBar
          label={t("Report.amount")}
          emptyLabel={t("Report.noRecords")}
          segments={[t("Report.small"), t("Report.normal"), t("Report.large")].map((label, index) => ({
            key: label,
            label,
            value: placeholder.amount[index] ?? 0,
            color: [colors.cottonPink, colors.flushPink, colors.flushEdge][index],
          }))}
        />
      </View>
      <View>
        <Text style={styles.groupHeading}>{t("Report.ease")}</Text>
        <ShareBar
          label={t("Report.ease")}
          emptyLabel={t("Report.noRecords")}
          segments={[t("Report.easy"), t("Report.normal"), t("Report.hard")].map((label, index) => ({
            key: label,
            label,
            value: placeholder.ease[index] ?? 0,
            color: [colors.cottonPink, colors.flushPink, colors.flushEdge][index],
          }))}
        />
      </View>

      <View>
        <Text style={styles.cardHeading}>{t("Report.colorTitle")}</Text>
        <ShareBar
          label={t("Report.colorTitle")}
          emptyLabel={t("Report.noRecords")}
          segments={(Object.keys(BOWEL_COLOR_LABELS) as BowelColor[]).map((key, index) => ({
            key,
            label: BOWEL_COLOR_LABELS[key].label,
            value: placeholder.colorCounts[index] ?? 0,
            color: BOWEL_COLOR_LABELS[key].hex,
          }))}
        />
      </View>

      <View>
        <Text style={styles.cardHeading}>{t("Report.weekdayAndTime")}</Text>
        <BarChart
          label={t("Report.weekdayAndTime")}
          emptyLabel={t("Report.noRecords")}
          height="sm"
          bars={WEEKDAYS.map((weekday, index) => ({
            label: weekdayShortLabel(weekday),
            value: placeholder.weekdayCounts[index] ?? 0,
          }))}
        />
        <Text style={[styles.groupHeading, { marginTop: spacing.md }]}>{t("Report.timeOfDay")}</Text>
        <ShareBar
          label={t("Report.timeOfDay")}
          emptyLabel={t("Report.noRecords")}
          segments={TIME_OF_DAY_KEYS.map((key, index) => ({
            key,
            label: t(`Report.${key}`),
            value: placeholder.timeOfDayCounts[index] ?? 0,
            color: TIME_OF_DAY_COLORS[index],
          }))}
        />
      </View>

      <View>
        <Text style={styles.cardHeading}>{t("Report.fourWeekTrend")}</Text>
        <TrendLine
          label={t("Report.fourWeekTrend")}
          emptyLabel={t("Report.noRecords")}
          points={placeholder.fourWeekTrend.map((week, index) => ({
            key: String(index),
            label: `${index + 1}${t("Report.week")}`,
            value: week.count,
            caption: t("Report.average", { value: week.average }),
          }))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg, paddingBottom: spacing.lg },
  card: { ...cardStyle, padding: spacing.lg },
  cardHeading: { fontFamily: fonts.black, fontSize: 18, color: colors.charcoal, letterSpacing: -0.3 },
  cardSub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.pencilGray, marginTop: 4 },
  countRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  countIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.blushWash,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { flex: 1 },
  sampleBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 6,
    backgroundColor: colors.blushWash,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  sampleBadgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.flushEdge },
  sampleBody: { opacity: 0.45 },
  sampleStack: { gap: spacing.xl },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  metric: {
    flexBasis: "46%",
    flexGrow: 1,
    borderRadius: 10,
    backgroundColor: colors.blushWash,
    padding: spacing.md,
  },
  metricLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.pencilGray },
  metricValue: { fontFamily: fonts.black, fontSize: 20, color: colors.charcoal, marginTop: 4 },
  metricDetail: { fontFamily: fonts.regular, fontSize: 11, color: colors.pencilGray, marginTop: 4 },
  groupHeading: { fontFamily: fonts.black, fontSize: 14, color: colors.charcoal },
  lockedCard: { alignItems: "center" },
  lockedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.flushPink,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedTitle: { fontFamily: fonts.black, fontSize: 18, color: colors.charcoal, marginTop: spacing.md, textAlign: "center" },
  lockedDescription: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.charcoal,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  ctaBlock: { marginTop: spacing.md, alignItems: "center" },
  ctaTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.charcoal, textAlign: "center" },
  ctaDescription: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.pencilGray,
    marginTop: 4,
    textAlign: "center",
  },
  ctaButton: { marginTop: spacing.lg, alignSelf: "stretch" },
});
