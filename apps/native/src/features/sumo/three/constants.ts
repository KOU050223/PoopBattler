// 数値は試作の three.js 部分に合わせる。ロジック座標 ×K = ワールド座標（docs/battle.md 2.1）
export const K = 0.045;
/** 取組の中心から各力士までの初期距離（ワールド） */
export const GAP = 0.95;
/** 土俵の上面の高さ。力士の足元はここに置く */
export const TOP = 1.05;
export const TOILET_X = 8.6;

/** yaw（取組の軸の回り込み）の上限。これ以上回すと東西がカメラの正面から外れる */
export const YAW_LIMIT = 1.3;

export const FOV_PORTRAIT = 62;
export const FOV_LANDSCAPE = 50;
/** これ未満を縦長として扱う */
export const PORTRAIT_ASPECT = 0.8;

/** 発光色 */
export const GLOW = {
  tsuki: 0xffc23a,
  grab: 0xff4a2a,
  special: 0xa86df0,
  parry: 0x5cdc84,
  dodge: 0x5ab8ff,
  hot: 0xff6a10,
  none: 0x000000,
} as const;
