import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  SPECIAL_GAUGE_MAX,
  TICK_INTERVAL_MS,
} from "@poopbattler/domain/battle/battle.constants";
import type { BattleSnapshot } from "@poopbattler/domain/battle/battle.types";

import { colors, fontSize, fonts, spacing } from "@/theme";
import { Button } from "./ui";

/** 攻撃は自動（web と同じ）。手動で押すのは ガード / 必殺 / 交代。 */
export function BattleControls({
  snapshot,
  onGuard,
  onSpecial,
  onSwitch,
}: {
  snapshot: BattleSnapshot & { party: NonNullable<BattleSnapshot["party"]> };
  onGuard: () => void;
  onSpecial: () => void;
  onSwitch: (index: number) => void;
}) {
  const { t } = useTranslation();
  const stunned = snapshot.switchStunTicks > 0;
  const switchLocked = stunned || snapshot.switchCooldownTicks > 0;
  const waitSeconds = Math.ceil(((snapshot.switchStunTicks + snapshot.switchCooldownTicks) * TICK_INTERVAL_MS) / 1000);
  const specialReady = snapshot.playerGauge >= SPECIAL_GAUGE_MAX && !stunned && snapshot.playerStance !== "special";
  const guardBlocked = snapshot.playerGuardCooldownTicks > 0 || snapshot.playerStance === "guard" || stunned;

  return (
    <View style={styles.root}>
      <View style={styles.gauge}>
        <View style={styles.gaugeText}>
          <Text style={styles.caption}>{t("Battle.specialGauge")}</Text>
          <Text style={styles.caption}>{snapshot.playerGauge} / {SPECIAL_GAUGE_MAX}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(100, (snapshot.playerGauge / SPECIAL_GAUGE_MAX) * 100)}%` }]} />
        </View>
      </View>
      <View style={styles.row}>
        <Button label={t("Battle.guard")} variant={snapshot.playerStance === "guard" ? "primary" : "secondary"} disabled={guardBlocked} onPress={onGuard} style={styles.flex} />
        <Button label={t("Battle.special")} variant="special" disabled={!specialReady} onPress={onSpecial} style={styles.flex} />
      </View>
      <View style={styles.row}>
        {snapshot.party.map((member, index) => {
          if (index === snapshot.activeIndex) return null;
          const down = member.hp <= 0;
          const blocked = down || switchLocked;
          const name = member.name ?? t("Battle.allyDefault");
          return (
            <Button
              key={`${member.characterId}-${index}`}
              label={t("Battle.switchTo", { name })}
              variant="secondary"
              disabled={blocked}
              onPress={() => onSwitch(index)}
              style={styles.flex}
            >
              <Text style={styles.sub}>
                {down ? t("Battle.benchDown") : switchLocked && waitSeconds > 0 ? t("Battle.switchWait", { seconds: waitSeconds }) : `${member.hp}/${member.maxHp}`}
              </Text>
            </Button>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
  gauge: { gap: spacing.xs },
  gaugeText: { flexDirection: "row", justifyContent: "space-between" },
  caption: { fontFamily: fonts.bold, fontSize: 12, color: colors.pencilGray },
  track: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.cottonPink },
  fill: { height: "100%", backgroundColor: colors.nightInk },
  sub: { fontFamily: fonts.regular, fontSize: fontSize.tab, color: colors.pencilGray },
});
