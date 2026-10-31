import type { BodyColorId, EyeId, HeadId, MouthId } from "../../battle/poopm-appearance";

/** プレイヤー（0 番）だけ素の頭。残りは帽子で見分ける */
const HEADS: readonly HeadId[] = ["none", "hat-a", "hat-b", "hat-c", "hat-d", "hat-e", "hat-f"];
/** 0 番はノーマルうんちくん（茶色）。敵はそれと被らない色を、互いに離れた順に当てる */
const BODY_COLORS: readonly BodyColorId[] = ["a", "red", "blue", "green", "orange", "purple", "cyan", "gold"];
const EYES: readonly EyeId[] = ["eye-a", "eye-b", "eye-c", "eye-d", "eye-e", "eye-f", "eye-g", "eye-h"];
const MOUTHS: readonly MouthId[] = ["mouth-a", "mouth-b", "mouth-c", "mouth-d", "mouth-e", "mouth-f", "mouth-g", "mouth-h"];

/**
 * 走者の見た目。レーンごとに固定（毎回同じ子が同じ見た目）で、結果には影響しない。
 * 頭は 7 種なので 8 体目だけ 0 番と同じ素の頭になるが、色が違うので見分けがつく。
 */
export function runnerAppearance(index: number) {
  return {
    color: BODY_COLORS[index % BODY_COLORS.length],
    eyes: EYES[index % EYES.length],
    mouth: MOUTHS[index % MOUTHS.length],
    head: HEADS[index % HEADS.length],
  };
}
