import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  BOWEL_AMOUNT_OPTIONS,
  BOWEL_COLOR_OPTIONS,
  BOWEL_EASE_OPTIONS,
  BOWEL_HARDNESS_OPTIONS,
  BOWEL_SYMPTOM_OPTIONS,
  type BowelLog,
  type BowelSymptom,
} from "@poopbattler/domain/records/bowel-log.types";

import { colors, elevation, fontSize, fonts, radius, spacing } from "@/theme";
import { FadeInView } from "@/components/fade-in-view";
import { LargeAmountSilhouette, SmallAmountSilhouette, SoftSilhouette, SpikySilhouette } from "./hardness-silhouettes";
import { StepSlider } from "./step-slider";
import { Button } from "./ui";

// 色は「選んだ色が見える」ことが目的なので、実物に近い代表色を置く。
const COLOR_SWATCHES: Record<BowelLog["color"], string> = {
  brown: "#8b5a2b",
  dark_brown: "#4a2c17",
  yellow: "#e3c12b",
  green: "#4f9d4f",
  red: "#d33b3b",
  black: "#1f1f1f",
  white_gray: "#d9d9d9",
  other: "#ffffff",
};

/** 質問1つ分のカード。右上に現在の選択を出し、何を選んだかを一目で分かるようにする。 */
function QuestionCard({
  order,
  title,
  selectedLabel,
  hint,
  children,
}: {
  order: number;
  title: string;
  selectedLabel?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <FadeInView delay={order * 70} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} accessibilityRole="header">{title}</Text>
        {selectedLabel !== undefined ? (
          <Text style={[styles.selected, !selectedLabel && styles.selectedEmpty]}>{selectedLabel ?? t("Battle.unselected")}</Text>
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </FadeInView>
  );
}

function labelOf<T extends string | number>(options: readonly { value: T; label: string }[], value: T | null) {
  return options.find((option) => option.value === value)?.label ?? null;
}

function Chips<T extends string>({
  options,
  isSelected,
  onPress,
  role,
}: {
  options: readonly { value: T; label: string }[];
  isSelected: (value: T) => boolean;
  onPress: (value: T) => void;
  role: "radio" | "checkbox";
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole={role}
            accessibilityState={role === "radio" ? { selected } : { checked: selected }}
            onPress={() => onPress(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ColorSwatches({ value, onChange }: { value: BowelLog["color"] | null; onChange: (value: BowelLog["color"]) => void }) {
  return (
    <View style={styles.swatches}>
      {BOWEL_COLOR_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={styles.swatchItem}
          >
            <View style={[styles.swatchRing, selected && styles.swatchRingSelected]}>
              <View style={[styles.swatch, { backgroundColor: COLOR_SWATCHES[option.value] }, option.value === "other" && styles.swatchOther]}>
                {option.value === "other" ? <Text style={styles.swatchOtherMark}>?</Text> : null}
              </View>
            </View>
            <Text style={[styles.swatchLabel, selected && styles.swatchLabelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 排便4項目は必須で、4つ揃うまで送信できない。症状は任意の複数選択。 */
export function BowelForm({ submitting, onSubmit }: { submitting: boolean; onSubmit: (log: BowelLog) => void }) {
  const { t } = useTranslation();
  const [hardness, setHardness] = useState<BowelLog["hardness"] | null>(null);
  const [amount, setAmount] = useState<BowelLog["amount"] | null>(null);
  const [color, setColor] = useState<BowelLog["color"] | null>(null);
  const [ease, setEase] = useState<BowelLog["ease"] | null>(null);
  const [symptoms, setSymptoms] = useState<BowelSymptom[]>([]);
  const ready = hardness !== null && amount !== null && color !== null && ease !== null;
  const remaining = [hardness, amount, color, ease].filter((value) => value === null).length;

  const toggleSymptom = (symptom: BowelSymptom) =>
    setSymptoms((current) => (current.includes(symptom) ? current.filter((s) => s !== symptom) : [...current, symptom]));

  return (
    <View style={styles.root}>
      <QuestionCard order={0} title={t("Battle.hardness")} selectedLabel={labelOf(BOWEL_HARDNESS_OPTIONS, hardness)}>
        <StepSlider
          options={BOWEL_HARDNESS_OPTIONS}
          value={hardness}
          onChange={setHardness}
          accessibilityLabel={t("Battle.hardness")}
          startLabel={t("Battle.hardnessStart")}
          endLabel={t("Battle.hardnessEnd")}
          placeholder={t("Battle.sliderPlaceholder")}
          startAdornment={<SpikySilhouette />}
          endAdornment={<SoftSilhouette />}
        />
      </QuestionCard>
      <QuestionCard order={1} title={t("Battle.amount")} selectedLabel={labelOf(BOWEL_AMOUNT_OPTIONS, amount)}>
        <StepSlider
          options={BOWEL_AMOUNT_OPTIONS}
          value={amount}
          onChange={setAmount}
          accessibilityLabel={t("Battle.amount")}
          startLabel={t("Battle.amountStart")}
          endLabel={t("Battle.amountEnd")}
          placeholder={t("Battle.sliderPlaceholder")}
          startAdornment={<SmallAmountSilhouette />}
          endAdornment={<LargeAmountSilhouette />}
        />
      </QuestionCard>
      <QuestionCard order={2} title={t("Battle.color")} selectedLabel={labelOf(BOWEL_COLOR_OPTIONS, color)}>
        <ColorSwatches value={color} onChange={setColor} />
      </QuestionCard>
      <QuestionCard order={3} title={t("Battle.ease")} selectedLabel={labelOf(BOWEL_EASE_OPTIONS, ease)}>
        <Chips options={BOWEL_EASE_OPTIONS} isSelected={(v) => v === ease} onPress={setEase} role="radio" />
      </QuestionCard>
      <QuestionCard order={4} title={t("Battle.symptoms")} hint={t("Battle.symptomsHint")}>
        <Chips
          options={BOWEL_SYMPTOM_OPTIONS}
          isSelected={(v) => symptoms.includes(v)}
          onPress={toggleSymptom}
          role="checkbox"
        />
      </QuestionCard>
      <SummaryPills
        labels={[
          labelOf(BOWEL_HARDNESS_OPTIONS, hardness),
          labelOf(BOWEL_AMOUNT_OPTIONS, amount),
          labelOf(BOWEL_COLOR_OPTIONS, color),
          labelOf(BOWEL_EASE_OPTIONS, ease),
        ]}
      />
      {!ready ? <Text style={styles.remaining}>{t("Battle.remaining", { count: remaining })}</Text> : null}
      <Button
        label={submitting ? t("Battle.submitting") : t("Battle.submit")}
        disabled={!ready || submitting}
        onPress={() => ready && onSubmit({ hardness, amount, color, ease, symptoms })}
      />
    </View>
  );
}

/** 選んだ内容を1行に並べ、送信前に今日の記録を見渡せるようにする。未選択の項目は出さない。 */
function SummaryPills({ labels }: { labels: (string | null)[] }) {
  const chosen = labels.filter((label): label is string => label !== null);
  if (chosen.length === 0) return null;
  return (
    <View style={styles.summary} accessibilityLabel={chosen.join("、")}>
      {chosen.map((label) => (
        <View key={label} style={styles.pill}>
          <Text style={styles.pillText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const SWATCH_SIZE = 44;

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  card: { backgroundColor: colors.paperWhite, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, ...elevation.card },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  cardTitle: { fontFamily: fonts.black, fontSize: 17, color: colors.charcoal },
  selected: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.flushEdge, flexShrink: 1, textAlign: "right" },
  selectedEmpty: { color: colors.pencilGray },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.pencilGray },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.blushWash,
    borderWidth: 2,
    borderColor: "transparent",
  },
  chipSelected: { backgroundColor: colors.flushEdge, borderColor: colors.flushEdge },
  chipText: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.charcoal },
  chipTextSelected: { color: colors.paperWhite },
  swatches: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md },
  swatchItem: { width: "25%", alignItems: "center", gap: 4 },
  swatchRing: {
    width: SWATCH_SIZE + 10,
    height: SWATCH_SIZE + 10,
    borderRadius: (SWATCH_SIZE + 10) / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  swatchRingSelected: { borderColor: colors.flushEdge },
  swatch: { width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: SWATCH_SIZE / 2, borderWidth: 1, borderColor: colors.fadedGray },
  swatchOther: { alignItems: "center", justifyContent: "center", borderStyle: "dashed" },
  swatchOtherMark: { fontFamily: fonts.bold, fontSize: 18, color: colors.pencilGray },
  swatchLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.charcoal },
  swatchLabelSelected: { fontFamily: fonts.bold, color: colors.flushEdge },
  summary: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.xs },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: 14, backgroundColor: colors.paperWhite },
  pillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.flushEdge },
  remaining: { fontFamily: fonts.bold, fontSize: 13, color: colors.pencilGray, textAlign: "center" },
});
