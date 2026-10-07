import { MAX_RANK, MAX_TIER } from "../character-growth";

type GrowthBadgeProps = {
  tier: number;
  rank: number;
  className?: string;
};

/** ★（段階）と凸（4つの点）を並べて出す。読み上げは「★2・3凸」の1語にまとめる。 */
export function GrowthBadge({ tier, rank, className = "" }: GrowthBadgeProps) {
  const label = growthLabel(tier, rank);

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <span aria-hidden="true" className="text-[13px] leading-none tracking-[-0.05em]">
        {Array.from({ length: MAX_TIER + 1 }, (_, index) => (
          <span
            key={index}
            className={index <= tier ? "text-amber-500" : "text-faded-gray"}
          >
            ★
          </span>
        ))}
      </span>
      <span aria-hidden="true" className="flex items-center gap-0.5">
        {Array.from({ length: MAX_RANK }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${
              index < rank ? "bg-flush-pink" : "bg-faded-gray/60"
            }`}
          />
        ))}
      </span>
    </span>
  );
}

export function growthLabel(tier: number, rank: number) {
  return `★${tier + 1}・${rank}凸`;
}
