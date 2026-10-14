/** 割合を1本の帯で見せる。量・出やすさ・時間帯・色のように、合計に対する内訳を持つ値に使う。 */

type Segment = {
  key: string;
  label: string;
  value: number;
  /** 帯の色。Tailwindのクラスではなく実際の色を渡す（うんちの色など、意味を持つ色があるため）。 */
  color: string;
  /** 帯の上に置く点の色。色が薄いと帯だけでは凡例と結び付かない。 */
  textColor?: string;
};

type Props = {
  segments: Segment[];
  ariaLabel: string;
  emptyLabel: string;
};

export function ShareBar({ segments, ariaLabel, emptyLabel }: Props) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return <p className="mt-3 rounded-lg bg-blush-wash/45 px-3 py-4 text-center text-xs text-pencil-gray">{emptyLabel}</p>;
  }

  return (
    <div className="mt-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-blush-wash/60" role="img" aria-label={ariaLabel}>
        {segments.map((segment) =>
          segment.value === 0 ? null : (
            <div key={segment.key} style={{ width: `${(segment.value / total) * 100}%`, background: segment.color }} />
          ),
        )}
      </div>
      <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: segment.color }} />
            <dt className="text-[11px] font-medium text-pencil-gray">{segment.label}</dt>
            <dd className="text-[11px] font-black tabular-nums text-charcoal">
              {segment.value}
              <span className="ml-0.5 font-medium text-pencil-gray">({Math.round((segment.value / total) * 100)}%)</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
