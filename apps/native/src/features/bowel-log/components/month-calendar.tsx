import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/design";
import { buildMonthGrid } from "../kiroku-calendar";

type MonthCalendarProps = {
  year: number;
  monthIndex: number;
  title: string;
  weekdays: readonly string[];
  loggedDays: ReadonlySet<number>;
  /** 今月以外を渡すときは null にして、今日の丸を出さない。 */
  today: number | null;
  stampedLabel: string;
};

const CELL = 40;

export function MonthCalendar({ year, monthIndex, title, weekdays, loggedDays, today, stampedLabel }: MonthCalendarProps) {
  const weeks = buildMonthGrid(year, monthIndex);

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <View style={styles.week}>
        {weekdays.map((weekday) => (
          <Text key={weekday} style={styles.weekday}>{weekday}</Text>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((day, dayIndex) => {
            if (day === null) return <View key={dayIndex} style={styles.slot} />;
            const isToday = day === today;
            const isLogged = loggedDays.has(day);
            return (
              <View key={dayIndex} style={styles.slot}>
                <View
                  style={[styles.day, isLogged && styles.logged, isToday && styles.today]}
                  accessible
                  accessibilityLabel={isLogged ? `${day} ${stampedLabel}` : String(day)}
                >
                  <Text style={[styles.dayText, isLogged && styles.loggedText, isToday && styles.todayText]}>{day}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.paper, borderRadius: radius.sheet },
  title: { textAlign: "center", fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.ink, marginBottom: spacing.xs },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.inkSoft },
  slot: { flex: 1, alignItems: "center" },
  day: { width: CELL, height: CELL, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  dayText: { fontFamily: fontFamily.numBold, fontSize: fontSize.childMin, color: colors.inkSoft },
  // 記録のある日は金のスタンプ（ご褒美の色）。今日は「選ばれている」ピンク。今日に記録があってもピンクを優先する。
  logged: { backgroundColor: `${colors.gold}40` },
  loggedText: { color: colors.goldEdge },
  today: { backgroundColor: colors.pink },
  todayText: { color: colors.paper },
});
