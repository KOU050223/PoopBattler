import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { PARTY_SIZE, matchupTone } from "@poopbattler/domain/battle/battle.constants";
import {
  isOutcomeOverlayDismissLocked,
  resolveBattleScreenView,
} from "@poopbattler/domain/battle/battle-screen-view";
import { parsePartyLineup } from "@poopbattler/domain/records/party-lineup";

import { keyValueStorage } from "@/adapters/storage";
import { ensureAnonymousSession } from "@/lib/anonymous-session";
import { getSupabase } from "@/lib/supabase";
import { colors, fontSize, fonts, radius, spacing } from "@/theme";
import { useBattleStore } from "../battle-store";
import {
  loadOwnedCharacterIds,
  loadPartyPreview,
  startBattleAction,
  type CompleteBattleResult,
  type PartyPreviewMember,
} from "../supabase-gateway";
import {
  loadBattlePartyIds,
  readPartyLineup,
} from "../../collection/party-lineup-storage";
import { useBattleHaptics, useBattleKeepAwake } from "../use-battle-feedback";
import { useBattleHydrated } from "../use-battle-hydration";
import { useBattleSpeed } from "../use-battle-speed";
import { useBattleTicker } from "../use-battle-ticker";
import { BattleCompletionFlow } from "./battle-completion-flow";
import { BattleControls } from "./battle-controls";
import { BattleStage } from "./battle-stage";
import { Button } from "./ui";

type Completed = Extract<CompleteBattleResult, { success: true }>;

export function BattleScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const hydrated = useBattleHydrated();
  const snapshot = useBattleStore((state) => state);
  const [speed, toggleSpeed] = useBattleSpeed();
  const [accepted, setAccepted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [preview, setPreview] = useState<PartyPreviewMember[]>([]);
  const overlayShownAt = useRef(0);

  const needsRestoreConfirm = hydrated && snapshot.status === "active" && !accepted;
  const fighting = hydrated && snapshot.status === "active" && accepted;

  useBattleTicker(fighting, speed);
  useBattleKeepAwake(fighting);
  useBattleHaptics(snapshot);

  const idle = hydrated && snapshot.status === "idle" && !completed;
  useEffect(() => {
    if (!idle) return;
    let alive = true;
    void (async () => {
      try {
        const supabase = getSupabase();
        const session = await ensureAnonymousSession(supabase.auth);
        if (session.status !== "ready" || !alive) return;
        const members = await loadPartyPreview(supabase);
        // 編成済みならその並びで出撃パーティを見せる（コレクション画面の先発と一致させる）。
        const partyIds = await loadBattlePartyIds(keyValueStorage, members.map((m) => m.id));
        const byId = new Map(members.map((m) => [m.id, m]));
        const ordered = partyIds.flatMap((id) => {
          const member = byId.get(id);
          return member ? [member] : [];
        });
        if (alive) setPreview(ordered.length ? ordered : members.slice(0, PARTY_SIZE));
      } catch {
        // プレビューは補助表示。失敗してもレンタル扱いで開始できる。
      }
    })();
    return () => {
      alive = false;
    };
  }, [idle]);

  const view = resolveBattleScreenView({
    status: snapshot.status,
    outcomeAcknowledged: snapshot.outcomeAcknowledged,
    hasParty: Boolean(snapshot.party),
    hasEnemy: Boolean(snapshot.enemy),
  });
  const awaitingAck = view.kind === "fight" ? view.showOutcomeOverlay : view.kind === "outcome-only";
  useEffect(() => {
    if (awaitingAck) overlayShownAt.current = Date.now();
  }, [awaitingAck]);

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const session = await ensureAnonymousSession(supabase.auth);
      if (session.status === "error") {
        setError(t("Battle.startError"));
        return;
      }
      // 編成はコレクション画面で端末ローカルに保存される。送るのは user_characters.id だけ
      // （HP/攻/速はサーバーがDBから確定）。未編成なら空配列＝新しい順の自動選出。
      let userCharacterIds: string[];
      try {
        const ownedIds = await loadOwnedCharacterIds(supabase);
        userCharacterIds = await loadBattlePartyIds(keyValueStorage, ownedIds);
      } catch {
        // 所持確認が失敗しても編成自体は捨てない。他者の個体は start_battle が返さない。
        userCharacterIds = parsePartyLineup(await readPartyLineup(keyValueStorage));
      }
      const result = await startBattleAction(supabase, { userCharacterIds });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      const current = useBattleStore.getState();
      if (result.resumed && current.battleId === result.battleId && current.status === "active") {
        setAccepted(true);
        return;
      }
      current.start({
        battleId: result.battleId,
        enemy: {
          characterId: result.enemy.characterId,
          attribute: result.enemy.attribute,
          name: result.enemy.name,
          hp: result.enemyHp,
          power: result.enemyPower,
          speed: result.enemySpeed,
        },
        party: result.party,
      });
      setAccepted(true);
    } catch {
      setError(t("Battle.startError"));
    } finally {
      setStarting(false);
    }
  }, [t]);

  const abandon = useCallback(() => {
    useBattleStore.getState().reset();
    setAccepted(false);
    setError(null);
  }, []);

  const handleCompleted = useCallback((result: Completed) => {
    // DB 確定に成功したときだけ復元用のバトルを破棄する。
    setCompleted(result);
    useBattleStore.getState().reset();
    setAccepted(false);
  }, []);

  const dismissOutcome = () => {
    if (isOutcomeOverlayDismissLocked(overlayShownAt.current, Date.now())) return;
    useBattleStore.getState().acknowledgeOutcome();
  };

  const pad = { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg };

  if (!hydrated) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.flushEdge} />
      </View>
    );
  }

  if (completed) {
    return (
      <View style={[styles.screen, pad, styles.gap]}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">{t("Battle.resultTitle")}</Text>
          <Text style={styles.body}>
            {completed.acquiredCharacter
              ? t("Battle.resultCompanion", { name: completed.acquiredCharacter.name })
              : t("Battle.resultNoCompanion")}
          </Text>
        </View>
        <Button label={t("Battle.again")} onPress={() => setCompleted(null)} />
      </View>
    );
  }

  if (needsRestoreConfirm && snapshot.enemy) {
    return (
      <View style={[styles.screen, pad, styles.gap]}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">{t("Battle.restoreTitle")}</Text>
          <Text style={styles.body}>{t("Battle.restoreEnemy", { name: snapshot.enemy.name ?? t("Battle.enemyDefault") })}</Text>
        </View>
        <Button label={t("Battle.restoreContinue")} onPress={() => setAccepted(true)} />
      </View>
    );
  }

  if (view.kind === "completion") {
    if (!snapshot.battleId) {
      return (
        <View style={[styles.screen, pad, styles.gap]}>
          <Text accessibilityRole="alert" style={styles.error}>{t("Battle.completeError")}</Text>
          <Button label={t("Battle.abandon")} variant="secondary" onPress={abandon} />
        </View>
      );
    }
    return (
      <BattleCompletionFlow
        battleId={snapshot.battleId}
        onCompleted={handleCompleted}
        onAbandon={abandon}
      />
    );
  }

  if (view.kind === "defeat") {
    return (
      <View style={[styles.screen, pad, styles.gap]}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">{t("Battle.outcomeLose")}</Text>
          <Text style={styles.body}>{t("Battle.defeatBody")}</Text>
        </View>
        <Button label={t("Battle.defeatEnd")} onPress={abandon} />
      </View>
    );
  }

  if (view.kind === "fight" && snapshot.party && snapshot.enemy) {
    const member = snapshot.party[snapshot.activeIndex];
    const tone = matchupTone(member.attribute, snapshot.enemy.attribute);
    const state = { ...snapshot, party: snapshot.party, enemy: snapshot.enemy };
    return (
      <View style={[styles.screen, pad, { paddingBottom: spacing.lg }, styles.gap]}>
        <View style={styles.topRow}>
          <View style={[styles.pill, tone === "advantage" && styles.pillAdv, tone === "disadvantage" && styles.pillDis]}>
            <Text style={[styles.pillText, tone === "disadvantage" && styles.pillTextOnDark]}>{t(`Battle.matchup.${tone}`)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={speed === 2 ? t("Battle.speedOff") : t("Battle.speedOn")}
            accessibilityState={{ selected: speed === 2 }}
            onPress={toggleSpeed}
            style={[styles.speed, speed === 2 && styles.speedOn]}
          >
            <Text style={[styles.pillText, speed === 2 && styles.pillTextOnDark]}>×{speed}</Text>
          </Pressable>
        </View>
        <BattleStage snapshot={state} />
        <BattleControls
          snapshot={state}
          onGuard={() => useBattleStore.getState().setStance("guard")}
          onSpecial={() => useBattleStore.getState().beginSpecial(speed)}
          onSwitch={(index) => useBattleStore.getState().switchMember(index)}
        />
        {awaitingAck ? <OutcomeOverlay status={snapshot.status} onDismiss={dismissOutcome} /> : null}
      </View>
    );
  }

  if (view.kind === "outcome-only") {
    return <OutcomeOverlay status={snapshot.status} onDismiss={dismissOutcome} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[pad, styles.gap, styles.scrollBottom]}>
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">{t("Battle.party")}</Text>
        {preview.length > 0 ? (
          preview.slice(0, PARTY_SIZE).map((member) => (
            <View key={member.id} style={styles.partyRow}>
              <Text style={styles.body}>{member.name}</Text>
              <Text style={styles.caption}>HP {member.hp}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.body}>{t("Battle.partyRental")}</Text>
        )}
      </View>
      {error ? (
        <View style={styles.gap}>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        </View>
      ) : null}
      <Button label={starting ? t("Battle.loading") : error ? t("Battle.retry") : t("Battle.start")} disabled={starting} onPress={() => void start()} />
    </ScrollView>
  );
}

function OutcomeOverlay({ status, onDismiss }: { status: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  const win = status !== "defeated";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t("Battle.outcomeTap")} onPress={onDismiss} style={styles.overlay}>
      <Text style={styles.overlayTitle}>{win ? t("Battle.outcomeWin") : t("Battle.outcomeLose")}</Text>
      <Text style={styles.overlaySub}>{t("Battle.outcomeTap")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  gap: { gap: spacing.md },
  scrollBottom: { paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.paperWhite, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  title: { fontFamily: fonts.black, fontSize: fontSize.title, color: colors.charcoal },
  body: { fontFamily: fonts.regular, fontSize: fontSize.body, lineHeight: 22, color: colors.charcoal },
  caption: { fontFamily: fonts.bold, fontSize: 12, color: colors.pencilGray },
  error: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.dangerEdge },
  partyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.fadedGray, backgroundColor: colors.paperWhite },
  pillAdv: { backgroundColor: colors.cottonPink, borderColor: colors.cottonPink },
  pillDis: { backgroundColor: colors.nightInk, borderColor: colors.nightInk },
  pillText: { fontFamily: fonts.bold, fontSize: 13, color: colors.charcoal },
  pillTextOnDark: { color: colors.paperWhite },
  speed: { minHeight: 44, minWidth: 56, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cottonPink, backgroundColor: colors.paperWhite },
  speedOn: { backgroundColor: colors.nightInk, borderColor: colors.nightInk },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "#ffe0efee" },
  overlayTitle: { fontFamily: fonts.black, fontSize: 32, color: colors.charcoal },
  overlaySub: { fontFamily: fonts.regular, fontSize: fontSize.body, color: colors.pencilGray },
});
