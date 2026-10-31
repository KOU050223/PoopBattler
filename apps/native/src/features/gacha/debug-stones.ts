import { router } from "expo-router";

import { keyValueStorage } from "@/adapters/storage";

import { STONES_PER_DAY, addStones } from "./gacha-state";
import { readGachaState, writeGachaState } from "./gacha-storage";

/** ホームが演出に使う、今回増えた石の数。 */
export const STONE_GAIN_PARAM = "stoneGain";

/** 開発用: 石を1日分足してホームへ戻す。ホームは増えた数を受け取って演出を出す。 */
export async function grantDebugStones(): Promise<void> {
  const state = await readGachaState(keyValueStorage);
  await writeGachaState(keyValueStorage, addStones(state, STONES_PER_DAY));
  // 設定画面はホームの上に積まれているので、ホームまで戻る。
  router.dismissTo({ pathname: "/", params: { [STONE_GAIN_PARAM]: String(STONES_PER_DAY) } });
}
