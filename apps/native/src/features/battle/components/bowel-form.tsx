import { useState } from "react";
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

import { colors, fontSize, fonts, radius, spacing } from "@/theme";
import { Button } from "./ui";

function ChipGroup<T extends string | number>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SymptomGroup({ values, onToggle }: { values: BowelSymptom[]; onToggle: (symptom: BowelSymptom) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{t("Battle.symptoms")}</Text>
      <Text style={styles.groupHint}>{t("Battle.symptomsHint")}</Text>
      <View style={styles.chips}>
        {BOWEL_SYMPTOM_OPTIONS.map((option) => {
          const selected = values.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => onToggle(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
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

  const toggleSymptom = (symptom: BowelSymptom) =>
    setSymptoms((current) => (current.includes(symptom) ? current.filter((s) => s !== symptom) : [...current, symptom]));

  return (
    <View style={styles.root}>
      <ChipGroup title={t("Battle.hardness")} options={BOWEL_HARDNESS_OPTIONS} value={hardness} onChange={setHardness} />
      <ChipGroup title={t("Battle.amount")} options={BOWEL_AMOUNT_OPTIONS} value={amount} onChange={setAmount} />
      <ChipGroup title={t("Battle.color")} options={BOWEL_COLOR_OPTIONS} value={color} onChange={setColor} />
      <ChipGroup title={t("Battle.ease")} options={BOWEL_EASE_OPTIONS} value={ease} onChange={setEase} />
      <SymptomGroup values={symptoms} onToggle={toggleSymptom} />
      <Button
        label={submitting ? t("Battle.submitting") : t("Battle.submit")}
        disabled={!ready || submitting}
        onPress={() => ready && onSubmit({ hardness, amount, color, ease, symptoms })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  group: { gap: spacing.sm },
  groupTitle: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.charcoal },
  groupHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.pencilGray },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cottonPink,
    backgroundColor: colors.paperWhite,
  },
  chipSelected: { backgroundColor: colors.flushEdge, borderColor: colors.flushEdge },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.charcoal },
  chipTextSelected: { color: colors.paperWhite },
});
