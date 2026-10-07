import { EmptyChart } from "./bar-chart";

/**
 * 4週間の推移を折れ線で見せる。
 *
 * 週ごとのカードを数字で並べるだけだと「増えているのか減っているのか」が
 * 読み比べないと分からない。折れ線は向きが一目で分かる。
 * 数値はSVGの外にテキストとして置く。
 */

type Point = {
  key: string;
  /** 横軸のラベル。「9/1週」など。 */
  label: string;
  value: number;
  /** 点の下に添える補足。平均の硬さなど。 */
  caption?: string;
};

type Props = {
  points: Point[];
  ariaLabel: string;
  emptyLabel: string;
};

/**
 * viewBox の比率は、実際に描かれる箱（w-full / h-24）の比率に寄せる。
 * preserveAspectRatio を none にすると点の円が楕円に潰れ、既定のままで
 * 比率が合っていないと図が左右に縮んで真ん中しか使わなくなる。
 * 端の点は半分が枠の外に出るので、左右にも半径ぶんの余白を取る。
 */
const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 96;
const INSET_X = 10;
const INSET_Y = 12;

export function TrendLine({ points, ariaLabel, emptyLabel }: Props) {
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
    <div className="mt-4">
      {/* aspect-ratio で箱の比率を viewBox に合わせる。高さ固定で幅だけ伸びると、
          既定の preserveAspectRatio では図が左右に縮んで真ん中しか使わない。 */}
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="w-full"
        style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
        role="img"
        aria-label={ariaLabel}
      >
        <polygon points={area} fill="var(--color-flush-pink)" opacity="0.18" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-flush-edge)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coordinates.map((point, index) => (
          <circle
            key={points[index].key}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="var(--color-paper-white)"
            stroke="var(--color-flush-edge)"
            strokeWidth="2.5"
          />
        ))}
      </svg>
      <ol className="mt-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
        {points.map((point) => (
          <li key={point.key} className="text-center">
            <p className="text-base font-black tabular-nums text-charcoal">{point.value}</p>
            <p className="text-[11px] text-pencil-gray">{point.label}</p>
            {point.caption ? <p className="text-[10px] text-pencil-gray">{point.caption}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
