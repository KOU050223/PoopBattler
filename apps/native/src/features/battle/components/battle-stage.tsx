import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { BattleSnapshot } from "@poopbattler/domain/battle/battle.types";

import { colors, fontSize, fonts, radius, spacing } from "@/theme";
import { appearanceForCharacter } from "../poopm-appearance";
import { PoopmSprite } from "./poopm-sprite";

export function HpBar({
  label,
  current,
  max,
  side,
}: {
  label: string;
  current: number;
  max: number;
  side: "ally" | "enemy";
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  return (
    <View style={styles.hp} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: current }}>
      <View style={styles.hpText}>
        <Text style={styles.hpLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.hpLabel}>{current} / {max}</Text>
      </View>
      <View style={styles.hpTrack}>
        <View style={[styles.hpFill, { width: `${ratio * 100}%`, backgroundColor: side === "enemy" ? colors.nightInk : colors.flushPink }]} />
      </View>
    </View>
  );
}

/** 2D ステージ。被弾はスナップショットの HP 差分から検出し、スプライトを揺らす。 */
export function BattleStage({ snapshot }: { snapshot: BattleSnapshot & { party: NonNullable<BattleSnapshot["party"]>; enemy: NonNullable<BattleSnapshot["enemy"]> } }) {
  const { t } = useTranslation();
  const member = snapshot.party[snapshot.activeIndex];
  const [hits, setHits] = useState({ player: 0, enemy: 0 });
  const prev = useRef({ player: member.hp, enemy: snapshot.enemy.hp, index: snapshot.activeIndex });

  useEffect(() => {
    const before = prev.current;
    prev.current = { player: member.hp, enemy: snapshot.enemy.hp, index: snapshot.activeIndex };
    if (snapshot.enemy.hp < before.enemy) setHits((h) => ({ ...h, enemy: h.enemy + 1 }));
    // 交代では HP 比較の対象が変わるので被弾扱いにしない。
    else if (snapshot.activeIndex === before.index && member.hp < before.player) setHits((h) => ({ ...h, player: h.player + 1 }));
  }, [member.hp, snapshot.enemy.hp, snapshot.activeIndex]);

  return (
    <View style={styles.stage}>
      <View style={styles.enemyRow}>
        <View style={styles.hpCol}>
          <HpBar label={snapshot.enemy.name ?? t("Battle.enemyDefault")} current={snapshot.enemy.hp} max={snapshot.enemy.maxHp} side="enemy" />
        </View>
        <PoopmSprite appearance={appearanceForCharacter(snapshot.enemy.characterId)} hitKey={hits.enemy} mirrored size={104} dimmed={snapshot.enemy.hp <= 0} />
      </View>
      <View style={styles.allyRow}>
        <PoopmSprite appearance={appearanceForCharacter(member.characterId)} hitKey={hits.player} size={104} dimmed={member.hp <= 0} />
        <View style={styles.hpCol}>
          <HpBar label={member.name ?? t("Battle.allyDefault")} current={member.hp} max={member.maxHp} side="ally" />
          {snapshot.playerStance === "special" ? <Text style={styles.charging}>{t("Battle.specialCharging")}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 280,
    justifyContent: "space-between",
    backgroundColor: colors.paperWhite,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cottonPink,
    padding: spacing.lg,
  },
  enemyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  allyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hpCol: { flex: 1, gap: spacing.sm },
  hp: { gap: spacing.xs },
  hpText: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  hpLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.pencilGray, flexShrink: 1 },
  hpTrack: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.blushWash },
  hpFill: { height: "100%", borderRadius: 4 },
  charging: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.flushEdge },
});
