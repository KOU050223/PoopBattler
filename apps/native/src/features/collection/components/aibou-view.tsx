import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lineupOwnedIds, resolveLineup } from "@poopbattler/domain/records/party-lineup";

import { keyValueStorage } from "@/adapters/storage";
import { collectionGateway } from "@/gateways";
import { useLoader } from "@/hooks/use-loader";
import { spacing } from "@/design";
import { HomeButton, SceneBackground } from "@/design/kids";
import { appearanceForCharacter } from "@/features/battle/poopm-appearance";
import { PoopmSprite } from "@/features/battle/components/poopm-sprite";

import { companionLevel, currentCompanion, switchCompanion, type CompanionDirection } from "../aibou-lineup";
import { readPartyLineup, writePartyLineup } from "../party-lineup-storage";
import { AibouChips } from "./aibou-chips";
import { AibouEmpty } from "./aibou-empty";
import { AibouHeader } from "./aibou-header";
import { AibouStatRow } from "./aibou-stat-row";

const COMPANION_SIZE = 240;
// 縦スクロールや軽い触れ方で切り替わらないよう、これ以上横に動いたときだけ切り替える。
const SWIPE_DISTANCE = 48;

const goHome = () => router.replace("/");

export function AibouView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, error, loading } = useLoader(() => collectionGateway().getCollectionCharacters());
  const characters = useMemo(() => data ?? [], [data]);

  const [stored, setStored] = useState<unknown>(null);
  useEffect(() => { void readPartyLineup(keyValueStorage).then(setStored); }, []);

  const lineup = useMemo(
    () => resolveLineup(stored, characters.map((character) => character.ownershipId)),
    [stored, characters],
  );
  const companion = currentCompanion(characters, lineup);

  const change = useCallback((direction: CompanionDirection) => {
    const next = switchCompanion(characters, stored, direction);
    setStored(lineupOwnedIds(next));
    void writePartyLineup(keyValueStorage, next);
  }, [characters, stored]);

  const swipe = Gesture.Pan()
    .runOnJS(true)
    // 縦方向に動いたときは他のジェスチャーに譲る。
    .activeOffsetX([-SWIPE_DISTANCE / 2, SWIPE_DISTANCE / 2])
    .failOffsetY([-24, 24])
    .onEnd((event) => {
      if (Math.abs(event.translationX) < SWIPE_DISTANCE) return;
      change(event.translationX < 0 ? "next" : "previous");
    });

  const top = insets.top + spacing.md;

  if (!companion) {
    return (
      <SceneBackground>
        <View style={{ paddingTop: top, paddingHorizontal: spacing.lg, alignItems: "flex-start" }}>
          <HomeButton onPress={goHome} />
        </View>
        {loading ? null : (
          <AibouEmpty
            title={t(error ? "NativeAibou.loadFailed" : "NativeAibou.emptyTitle")}
            hint={error ? undefined : t("NativeAibou.emptyHint")}
            actionLabel={t("NativeAibou.goHome")}
            isError={Boolean(error)}
            onAction={goHome}
          />
        )}
      </SceneBackground>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SceneBackground>
        <View style={{ paddingTop: top, gap: spacing.sm }}>
          <AibouHeader
            name={companion.name}
            previousLabel={t("NativeAibou.previous")}
            nextLabel={t("NativeAibou.next")}
            onHome={goHome}
            onPrevious={() => change("previous")}
            onNext={() => change("next")}
          />
          <AibouChips
            level={t("NativeAibou.level", { level: companionLevel(companion) })}
            attribute={t(`NativeAibou.attributes.${companion.attribute}`)}
          />
        </View>

        <GestureDetector gesture={swipe}>
          <View style={styles.stage}>
            <PoopmSprite appearance={appearanceForCharacter(companion.id)} hitKey={0} size={COMPANION_SIZE} />
          </View>
        </GestureDetector>

        <View style={{ paddingBottom: insets.bottom + spacing.lg }}>
          <AibouStatRow
            stats={[
              { label: t("NativeAibou.hp"), value: companion.hp },
              { label: t("NativeAibou.power"), value: companion.power },
              { label: t("NativeAibou.speed"), value: companion.speed },
            ]}
          />
        </View>
      </SceneBackground>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
});
