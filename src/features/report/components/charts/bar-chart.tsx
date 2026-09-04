/**
 * レポートの図はすべてSVG/CSSで描く。
 *
 * チャートライブラリを入れると "use client" が必要になり、レポート全体が
 * クライアント境界に入る。この機能は「非課金の人のペイロードに分析値を
 * 載せない」ことを型で守っている（actions.ts）ので、境界を増やしたくない。
 * 扱う点数は3〜7点しかなく、描画エンジンを積む理由もない。
 *
 * 数値は必ずDOMのテキストとして置き、棒や線は装飾として重ねる。
 * 図だけにすると読み上げで値が失われ、ティザーのぼかしも成立しなくなる。
 */

type Bar = {
  /** 軸のラベル。短い文字列を想定する。 */
  label: string;
  value: number;
  /** 目盛りの下に添える補足。無ければ描かない。 */
  caption?: string;
  /** 強調する棒（3から5の安定帯など）。 */
  highlighted?: boolean;
};

type Props = {
  bars: Bar[];
  /** 値に付ける単位。「件」など。 */
  unit?: string;
  /** 図全体の説明。読み上げ用に使う。 */
  ariaLabel: string;
  /** 記録が0件のときに出す文言。 */
  emptyLabel: string;
  height?: "sm" | "md";
};

const HEIGHT_CLASS = { sm: "h-16", md: "h-24" } as const;

export function BarChart({ bars, unit = "", ariaLabel, emptyLabel, height = "md" }: Props) {
  const max = Math.max(...bars.map((bar) => bar.value), 0);

  // 全部0の週で max を割ると NaN になり、棒が消えるのではなく壊れる。
  if (max === 0) return <EmptyChart label={emptyLabel} />;

  return (
    <ol className="mt-4 flex items-end gap-1.5" aria-label={ariaLabel}>
      {bars.map((bar) => (
        <li key={bar.label} className="flex min-w-0 flex-1 flex-col items-center">
          <p className="text-[11px] font-black tabular-nums text-charcoal">{bar.value}</p>
          <div className={`mt-1 flex w-full items-end rounded-md bg-blush-wash/50 p-0.5 ${HEIGHT_CLASS[height]}`}>
            <div
              className={`w-full rounded ${bar.highlighted ? "bg-flush-edge" : "bg-flush-pink"}`}
              style={{ height: `${bar.value === 0 ? 0 : Math.max(8, (bar.value / max) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 truncate text-[11px] font-bold text-charcoal">{bar.label}</p>
          {bar.caption ? <p className="truncate text-[10px] text-pencil-gray">{bar.caption}</p> : null}
          <span className="sr-only">{unit}</span>
        </li>
      ))}
    </ol>
  );
}

export function EmptyChart({ label }: { label: string }) {
  return (
    <p className="mt-4 rounded-xl bg-blush-wash/45 px-3 py-6 text-center text-sm text-pencil-gray">{label}</p>
  );
}
