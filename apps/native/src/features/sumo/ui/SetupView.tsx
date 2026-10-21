import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Segmented } from "@/components/ui";
import { colors, fonts, spacing } from "@/theme";

import { DIFFICULTIES, FAVORITE_NAMES, MODES, SPECIES } from "../config";
import { CONTROL_GUIDE, MODE_DESCRIPTIONS, READING_GUIDE, SPECIES_SHORT_NAMES } from "./labels";
import type { MatchSetup, MatchView } from "./session";

const MAX_PANEL_WIDTH = 440;
/** 相手の選択肢で「おまかせ」を表す値（種族の id とは重ならない） */
const RANDOM_OPPONENT = "random";

const speciesLabel = (id: string, fallback: string): string => SPECIES_SHORT_NAMES[id] ?? fallback;
const playerOptions = SPECIES.map((species) => ({ value: species.id, label: speciesLabel(species.id, species.kind) }));
const opponentOptions = [{ value: RANDOM_OPPONENT, label: "おまかせ" }, ...playerOptions];
const difficultyOptions = DIFFICULTIES.map((difficulty) => ({ value: difficulty.id, label: difficulty.name }));
const modeOptions = MODES.map((mode) => ({ value: mode.id, label: mode.name }));

const viewOptions: { value: MatchView; label: string }[] = [
  { value: "3d", label: "3D" },
  { value: "2d", label: "2D" },
];

const speciesById = (id: string) => SPECIES.find((species) => species.id === id) ?? SPECIES[0];

/** 開始前メニュー。自分の力士・相手・モード・番付を選び、操作を確認して「はっけよい」 */
export function SetupView({ setup, onChange, onStart, onBack }: {
  setup: MatchSetup; onChange: (setup: MatchSetup) => void; onStart: () => void; onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const player = setup.playerSpecies;
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">うんちくん相撲</Text>
          <Field label="あなたの力士（東）" note={`得意：${FAVORITE_NAMES[player.fav]}。${player.special.desc}`}>
            <Segmented options={playerOptions} value={player.id} onChange={(id) => onChange({ ...setup, playerSpecies: speciesById(id) })} />
          </Field>
          <Field label="相手（西）">
            <Segmented
              options={opponentOptions}
              value={setup.isOpponentRandom ? RANDOM_OPPONENT : setup.opponentSpecies.id}
              onChange={(id) =>
                onChange(id === RANDOM_OPPONENT ? { ...setup, isOpponentRandom: true } : { ...setup, isOpponentRandom: false, opponentSpecies: speciesById(id) })
              }
            />
          </Field>
          <Field label="モード" note={MODE_DESCRIPTIONS[setup.mode.id]}>
            <Segmented
              options={modeOptions}
              value={setup.mode.id}
              onChange={(id) => onChange({ ...setup, mode: MODES.find((mode) => mode.id === id) ?? setup.mode })}
            />
          </Field>
          <Field label="番付（NPCの強さ）">
            <Segmented
              options={difficultyOptions}
              value={setup.difficulty.id}
              onChange={(id) => onChange({ ...setup, difficulty: DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? setup.difficulty })}
            />
          </Field>
          <Field label="表示">
            <Segmented options={viewOptions} value={setup.view} onChange={(view) => onChange({ ...setup, view })} />
          </Field>
          <View style={styles.guide}>
            {CONTROL_GUIDE.map(({ term, description }) => (
              <View key={term} style={styles.guideRow}>
                <Text style={styles.guideTerm}>{term}</Text>
                <Text style={styles.guideDescription}>{description}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.reading}>{READING_GUIDE}</Text>
        </View>
      </ScrollView>
      {/* 親指が届く画面下に primary を置く */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.actionsInner}>
          <Button label="はっけよい" onPress={onStart} />
          <Button label="戻る" variant="secondary" onPress={onBack} />
        </View>
      </View>
    </View>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {note ? <Text style={styles.fieldNote}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paperWhite },
  scroll: { alignItems: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  panel: { width: "100%", maxWidth: MAX_PANEL_WIDTH, gap: spacing.lg },
  title: { fontFamily: fonts.black, fontSize: 28, color: colors.charcoal },
  field: { gap: spacing.xs },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.pencilGray },
  fieldNote: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.pencilGray, minHeight: 36 },
  guide: { gap: spacing.sm, padding: spacing.md, borderRadius: 12, backgroundColor: colors.blushWash },
  guideRow: { gap: 2 },
  guideTerm: { fontFamily: fonts.bold, fontSize: 13, color: colors.charcoal },
  guideDescription: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.pencilGray },
  reading: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, color: colors.pencilGray },
  actions: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.sm, backgroundColor: colors.paperWhite },
  actionsInner: { width: "100%", maxWidth: MAX_PANEL_WIDTH, gap: spacing.sm },
});
