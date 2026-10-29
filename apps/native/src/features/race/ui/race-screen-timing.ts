// 開始からの実時間で決まる進行：カウントダウンと、結果へ移る上限。ループから純関数で呼ぶ

/** スタート前に集団を周回して見せる時間。カウントダウンの 3・2・1 と同じ長さ */
export const COUNTDOWN_SEC = 3;
/** 「スタート！」を出し続ける時間 */
export const GO_SHOWN_SEC = 0.6;

/**
 * 実時間でこれを過ぎたら、isOver が来なくても結果へ移る（開始ボタンからの経過。カウントダウンを含む）。
 * 何かの理由でレースが終わらなくても、画面が固まらないための安全弁
 */
export const RACE_TIME_LIMIT_MS = 90_000;

/** 1フレームの実時間の上限。バックグラウンドから戻った直後の大きな dt でシミュレーションが飛ばないように */
export const MAX_FRAME_SEC = 0.1;

export const isCountdown = (elapsedMs: number): boolean => elapsedMs < COUNTDOWN_SEC * 1000;

export const hasHitTimeLimit = (elapsedMs: number): boolean => elapsedMs >= RACE_TIME_LIMIT_MS;

/** 今出すカウントダウンの文字。何も出さない間は null。値が変わったときだけ画面に出すために使う */
export function countdownLabel(elapsedMs: number): string | null {
  if (elapsedMs < 0) return null;
  if (isCountdown(elapsedMs)) return String(COUNTDOWN_SEC - Math.floor(elapsedMs / 1000));
  return elapsedMs < (COUNTDOWN_SEC + GO_SHOWN_SEC) * 1000 ? "スタート！" : null;
}
