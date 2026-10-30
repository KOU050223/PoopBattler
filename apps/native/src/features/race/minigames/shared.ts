import { GRADES } from "../config";
import type { Grade, MinigameEvent, RaceCommand } from "../types";

/** ミニゲームを遊ぶのは常に走者0番 */
export const PLAYER_INDEX = 0;

/** 1回の呼び出しで溜まる、エンジンへの指示と UI 用の出来事 */
export interface MinigameOutput {
  commands: RaceCommand[];
  events: MinigameEvent[];
}

export const createOutput = (): MinigameOutput => ({ commands: [], events: [] });

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function gradeOf(average: number): Grade {
  return GRADES.find((entry) => average >= entry.min)!.grade;
}

export const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
