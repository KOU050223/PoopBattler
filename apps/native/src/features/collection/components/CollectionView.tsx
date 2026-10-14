import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ATTRIBUTE_LABELS } from "@poopbattler/domain/battle/battle.constants";
import { COLLECTION_RARITY_LABELS, type CollectionCharacter } from "@poopbattler/domain/records/character.types";
import { resolveLineup, swapLineupSlot, type PartyLineup } from "@poopbattler/domain/records/party-lineup";

import { keyValueStorage } from "@/adapters/storage";
import { colors, fontSize, fonts, spacing } from "@/theme";

import { collectionGateway } from "../../gateways";
import { Button, cardStyle, Chip, dateFormatter, EmptyState } from "../../records-ui";
import { useLoader } from "../../use-loader";
import { readPartyLineup, writePartyLineup } from "../party-lineup-storage";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function CollectionView({ bottomInset }: { bottomInset: number }) {
  const { t, i18n } = useTranslation();
  const { data, error, loading, reload } = useLoader(() => collectionGateway().getCollectionCharacters());
  const characters = useMemo(() => data ?? [], [data]);
  const ownedIds = useMemo(() => characters.map((c) => c.ownershipId), [characters]);

  const [stored, setStored] = useState<unknown>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  useEffect(() => { void readPartyLineup(keyValueStorage).then(setStored); }, []);

  const lineup = useMemo(() => resolveLineup(stored, ownedIds), [stored, ownedIds]);
  const starterIds = useMemo(() => new Set(lineup.filter((id): id is string => id != null)), [lineup]);
  const byOwnership = (id: string | null) => characters.find((c) => c.ownershipId === id);

  const pick = (ownershipId: string) => {
    if (selectedSlot == null) return;
    const next: PartyLineup = swapLineupSlot(lineup, selectedSlot, ownershipId);
    setStored(next.filter((id) => id != null));
    setSelectedSlot(null);
    void writePartyLineup(keyValueStorage, next);
  };

  const header = (
    <View style={styles.headerBlock}>
      {error ? <Text style={styles.error} accessibilityRole="alert">{t("Collection.loadFailed")}</Text> : null}
      <Text style={styles.heading} accessibilityRole="header">{t("Collection.starter")}</Text>
      {characters.length > 0 ? <Text style={styles.muted}>{t(selectedSlot != null ? "Collection.hintPickCharacter" : "Collection.hintSelectSlot")}</Text> : null}
      <View style={styles.slots}>
        {lineup.map((id, index) => {
          const character = byOwnership(id);
          const selected = selectedSlot === index;
          return (
            <Pressable
              key={index}
              disabled={!character}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !character }}
              onPress={() => setSelectedSlot((current) => (current === index ? null : index))}
              style={[styles.slot, !character && styles.slotEmpty, selected && styles.slotSelected]}
            >
              <Text style={styles.slotName} numberOfLines={2}>{character ? character.name : t("Collection.slotEmpty")}</Text>
              <Text style={styles.muted}>{character ? t("Collection.starterN", { n: index + 1 }) : t("Collection.rental")}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.heading, styles.ownedHeading]} accessibilityRole="header">{t("Collection.owned")}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: CollectionCharacter }) => {
    const inParty = starterIds.has(item.ownershipId);
    return (
      <Pressable
        disabled={selectedSlot == null}
        accessibilityRole="button"
        onPress={() => pick(item.ownershipId)}
        style={[styles.card, inParty && styles.cardInParty, selectedSlot != null && styles.cardPickable]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Chip label={COLLECTION_RARITY_LABELS[item.rarity]} />
        </View>
        {inParty ? <Text style={styles.inParty}>{t("Collection.inParty")}</Text> : null}
        <Text style={styles.muted}>
          {t("Collection.attribute")} {ATTRIBUTE_LABELS[item.attribute]} ・ {t("Collection.acquired")} {dateFormatter(i18n.language, item.acquiredAt)}
        </Text>
        <View style={styles.stats}>
          <Stat label={t("Collection.hp")} value={item.hp} />
          <Stat label={t("Collection.power")} value={item.power} />
          <Stat label={t("Collection.speed")} value={item.speed} />
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={characters}
      keyExtractor={(c) => c.ownershipId}
      renderItem={renderItem}
      refreshing={loading}
      onRefresh={() => void reload()}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading || error ? null : (
          <EmptyState
            title={t("Collection.noCharacters")}
            description={t("Collection.noCharactersHint")}
            actions={
              <>
                <Button label={t("Collection.logMeal")} variant="secondary" onPress={() => router.push("/meals")} />
                <Button label={t("Collection.goToBattle")} onPress={() => router.push("/battle")} />
              </>
            }
          />
        )
      }
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset + spacing.xxl }]}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  headerBlock: { gap: spacing.sm },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.charcoal },
  ownedHeading: { marginTop: spacing.md },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.pencilGray },
  error: { fontFamily: fonts.bold, fontSize: 13, color: colors.dangerEdge },
  slots: { flexDirection: "row", gap: spacing.sm },
  slot: { ...cardStyle, flex: 1, minHeight: 88, padding: spacing.sm, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  slotEmpty: { borderStyle: "dashed", backgroundColor: colors.blushWash },
  slotSelected: { borderColor: colors.flushEdge, backgroundColor: colors.blushWash },
  slotName: { fontFamily: fonts.bold, fontSize: 13, color: colors.charcoal, textAlign: "center" },
  card: { ...cardStyle, padding: spacing.md, gap: spacing.sm },
  cardInParty: { backgroundColor: colors.blushWash },
  cardPickable: { borderColor: colors.flushPink },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.charcoal },
  inParty: { fontFamily: fonts.bold, fontSize: 12, color: colors.flushEdge },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.blushWash, borderRadius: 10, paddingVertical: spacing.sm, alignItems: "center" },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.pencilGray },
  statValue: { fontFamily: fonts.black, fontSize: 20, color: colors.charcoal },
});
