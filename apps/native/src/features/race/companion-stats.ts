import type { RunnerStats } from "./types";

/**
 * レースに渡す相棒のステータス。
 * TODO(soma): レベル・ポイントのデータがまだサーバーにない（level.md「未決」）。決まるまで全員バランス型で走らせる。
 * 差し替え口をここ1か所にしてあるので、データができたらこの関数だけを変える。
 */
export function companionRunnerStats(): RunnerStats {
  return { stamina: 5, power: 5, technique: 5 };
}
