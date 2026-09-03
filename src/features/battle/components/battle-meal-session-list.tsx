import { MealLogImage } from "@/features/meal/components/meal-log-image";
import type { MealLog } from "@/features/meal/actions";
import { MEAL_TAGS } from "@/features/meal/meal.types";
import { captionTextClass } from "@/lib/ui-classes";

type BattleMealSessionListProps = {
  logs: MealLog[];
};

function formatEatenAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTagLabel(tag: string) {
  return MEAL_TAGS.find((item) => item.value === tag)?.label ?? tag;
}

/** この回で送る食事だけを、完了ボタンの上に積む。 */
export function BattleMealSessionList({ logs }: BattleMealSessionListProps) {
  if (logs.length === 0) return null;

  return (
    <section aria-labelledby="session-meal-logs" className="meal-recent-section !mt-3">
      <div className="meal-recent-heading">
        <div>
          <h2 id="session-meal-logs">今回の食事</h2>
          <p>この回で記録した食事です。完了するまで次の写真も足せます。</p>
        </div>
        <span>{logs.length}件</span>
      </div>
      <ul className="grid grid-cols-1 gap-3">
        {logs.map((mealLog) => (
          <li key={mealLog.id} className="meal-log-card">
            <div className="meal-log-card-image">
              <MealLogImage photoId={mealLog.photoId} />
            </div>
            <div className="meal-log-card-content">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-charcoal">{getTagLabel(mealLog.tag)}</p>
                  <p className={captionTextClass}>{formatEatenAt(mealLog.eatenAt)}</p>
                </div>
                <span className="meal-log-tag">{getTagLabel(mealLog.tag)}</span>
              </div>
              {mealLog.note ? (
                <p className="mt-2 text-sm leading-relaxed text-charcoal">{mealLog.note}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
