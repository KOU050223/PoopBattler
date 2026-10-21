import { StyleSheet, Text, View } from "react-native";

import { Button, Segmented } from "@/features/records-ui";
import { colors, fonts, spacing } from "@/theme";

import { DIFFICULTIES, MODES, SPECIES } from "../config";
import { SPECIES_SHORT_NAMES } from "./labels";
import type { MatchSetup } from "./session";

const speciesOptions = SPECIES.map((species) => ({ value: species.id, label: SPECIES_SHORT_NAMES[species.id] ?? species.kind }));
const difficultyOptions = DIFFICULTIES.map((difficulty) => ({ value: difficulty.id, label: difficulty.name }));
const modeOptions = MODES.map((mode) => ({ value: mode.id, label: mode.name }));

const speciesById = (id: string) => SPECIES.find((species) => species.id === id) ?? SPECIES[0];

export function SetupView({ setup, onChange, onStart, onBack }: {
  setup: MatchSetup; onChange: (setup: MatchSetup) => void; onStart: () => void; onBack: () => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.fields}>
        <Text style={styles.title}>うんち相撲 NPC戦</Text>
        <Field label="相手の番付">
          <Segmented
            options={difficultyOptions}
            value={setup.difficulty.id}
            onChange={(id) => onChange({ ...setup, difficulty: DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? setup.difficulty })}
          />
        </Field>
        <Field label="自分">
          <Segmented options={speciesOptions} value={setup.playerSpecies.id} onChange={(id) => onChange({ ...setup, playerSpecies: speciesById(id) })} />
        </Field>
        <Field label="相手">
          <Segmented options={speciesOptions} value={setup.opponentSpecies.id} onChange={(id) => onChange({ ...setup, opponentSpecies: speciesById(id) })} />
        </Field>
        <Field label="モード">
          <Segmented
            options={modeOptions}
            value={setup.mode.id}
            onChange={(id) => onChange({ ...setup, mode: MODES.find((mode) => mode.id === id) ?? setup.mode })}
          />
        </Field>
      </View>
      {/* 親指が届く画面下に primary を置く */}
      <View style={styles.actions}>
        <Button label="はじめる" onPress={onStart} />
        <Button label="戻る" variant="secondary" onPress={onBack} />
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paperWhite, padding: spacing.xl, justifyContent: "space-between" },
  fields: { gap: spacing.lg },
  title: { fontFamily: fonts.black, fontSize: 20, color: colors.charcoal },
  field: { gap: spacing.xs },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.pencilGray },
  actions: { gap: spacing.sm },
});
