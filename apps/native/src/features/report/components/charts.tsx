import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polygon, Polyline } from "react-native-svg";

import { colors, fonts, spacing } from "@/theme";

// apps/web/src/features/report/components/charts/* の RN 移植。
// 数値は必ずテキストとして置き、棒や線は装飾として重ねる（読み上げと
// ティーザー表示を成立させるため、web と同じ考え方）。

export type Bar = {
  label: string;
  value: number;
  /** 目盛りの下に添える補足。 */
  caption?: string;
  highlighted?: boolean;
};

const CHART_HEIGHT = { sm: 64, md: 96 } as const;

export function BarChart({ bars, label, emptyLabel, height = "md" }: {
  bars: Bar[];
  label: string;
  emptyLabel: string;
  height?: keyof typeof CHART_HEIGHT;
}) {
  const max = Math.max(...bars.map((bar) => bar.value), 0);
  if (max === 0) return <EmptyChart label={emptyLabel} />;

  return (
    <View style={styles.barRow} accessibilityLabel={label} accessibilityRole="summary">
      {bars.map((bar, index) => (
        <View key={`${bar.label}-${index}`} style={styles.barCol}>
          <Text style={styles.barValue}>{bar.value}</Text>
          <View style={[styles.barTrack, { height: CHART_HEIGHT[height] }]}>
            <View
              style={[
                styles.bar,
                { height: bar.value === 0 ? 0 : `${Math.max(8, (bar.value / max) * 100)}%` },
                bar.highlighted ? styles.barHighlighted : styles.barNormal,
              ]}
            />
          </View>
          <Text style={styles.barLabel} numberOfLines={1}>{bar.label}</Text>
          {bar.caption ? <Text style={styles.barCaption} numberOfLines={1}>{bar.caption}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export type ShareSegment = {
  key: string;
  label: string;
  value: number;
  /** 意味を持つ色があるため、実際の色を渡す（うんちの色など）。 */
  color: string;
};

export function ShareBar({ segments, label, emptyLabel }: {
  segments: ShareSegment[];
  label: string;
  emptyLabel: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total === 0) return <EmptyChart label={emptyLabel} small />;

  return (
    <View>
      <View style={styles.shareTrack} accessibilityLabel={label}>
        {segments.map((segment) =>
          segment.value === 0 ? null : (
            <View
              key={segment.key}
              style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
            />
          ),
        )}
      </View>
      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <Text style={styles.legendLabel}>{segment.label}</Text>
            <Text style={styles.legendValue}>
              {segment.value}
              <Text style={styles.legendShare}> ({Math.round((segment.value / total) * 100)}%)</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export type TrendPoint = {
  key: string;
  label: string;
  value: number;
  caption?: string;
};

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 96;
const INSET_X = 10;
const INSET_Y = 12;

export function TrendLine({ points, label, emptyLabel }: {
  points: TrendPoint[];
  label: string;
  emptyLabel: string;
}) {
  const max = Math.max(...points.map((point) => point.value), 0);
  if (points.length === 0 || max === 0) return <EmptyChart label={emptyLabel} />;

  const span = VIEW_WIDTH - INSET_X * 2;
  const coordinates = points.map((point, index) => ({
    x: INSET_X + (points.length === 1 ? span / 2 : (index / (points.length - 1)) * span),
    y: VIEW_HEIGHT - INSET_Y - (point.value / max) * (VIEW_HEIGHT - INSET_Y * 2),
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${coordinates[0].x},${VIEW_HEIGHT} ${line} ${coordinates[coordinates.length - 1].x},${VIEW_HEIGHT}`;

  return (
    <View>
      <Svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        width="100%"
        style={{ aspectRatio: VIEW_WIDTH / VIEW_HEIGHT }}
        accessibilityLabel={label}
      >
        <Polygon points={area} fill={colors.flushPink} opacity={0.18} />
        <Polyline
          points={line}
          fill="none"
          stroke={colors.flushEdge}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coordinates.map((point, index) => (
          <Circle
            key={points[index].key}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={colors.paperWhite}
            stroke={colors.flushEdge}
            strokeWidth={2.5}
          />
        ))}
      </Svg>
      <View style={styles.trendLabels}>
        {points.map((point) => (
          <View key={point.key} style={styles.trendLabelCol}>
            <Text style={styles.trendValue}>{point.value}</Text>
            <Text style={styles.trendLabel} numberOfLines={1}>{point.label}</Text>
            {point.caption ? <Text style={styles.trendCaption} numberOfLines={1}>{point.caption}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyChart({ label, small }: { label: string; small?: boolean }) {
  return (
    <View style={[styles.empty, small && styles.emptySmall]}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: spacing.lg },
  barCol: { flex: 1, minWidth: 0, alignItems: "center" },
  barValue: { fontFamily: fonts.black, fontSize: 11, color: colors.charcoal },
  barTrack: {
    width: "100%",
    justifyContent: "flex-end",
    borderRadius: 6,
    backgroundColor: colors.blushWash,
    padding: 2,
    marginTop: 4,
  },
  bar: { width: "100%", borderRadius: 4 },
  barNormal: { backgroundColor: colors.flushPink },
  barHighlighted: { backgroundColor: colors.flushEdge },
  barLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.charcoal, marginTop: 6 },
  barCaption: { fontFamily: fonts.regular, fontSize: 10, color: colors.pencilGray },
  shareTrack: {
    flexDirection: "row",
    height: 12,
    width: "100%",
    overflow: "hidden",
    borderRadius: 6,
    backgroundColor: colors.blushWash,
    marginTop: spacing.sm,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.lg, rowGap: 6, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.pencilGray },
  legendValue: { fontFamily: fonts.black, fontSize: 11, color: colors.charcoal },
  legendShare: { fontFamily: fonts.regular, color: colors.pencilGray },
  trendLabels: { flexDirection: "row", marginTop: 4 },
  trendLabelCol: { flex: 1, minWidth: 0, alignItems: "center" },
  trendValue: { fontFamily: fonts.black, fontSize: 16, color: colors.charcoal },
  trendLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.pencilGray },
  trendCaption: { fontFamily: fonts.regular, fontSize: 10, color: colors.pencilGray },
  empty: {
    borderRadius: 10,
    backgroundColor: colors.blushWash,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  emptySmall: { paddingVertical: spacing.lg, marginTop: spacing.sm },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.pencilGray,
    textAlign: "center",
  },
});
