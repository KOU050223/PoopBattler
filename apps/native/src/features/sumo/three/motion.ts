import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";

import type { Fighter, Game } from "../types";

/**
 * 力士の状態から、うんちくんGLBのクリップを選ぶ。位置・傾き・潰れは pose.ts が毎フレーム与えるので、
 * ここは「クリップを切り替えるべき節目」だけを返す（windup の突きは pose の反りで表現するため idle のまま）
 */
export function motionOf(fighter: Fighter, game: Game): Poopm3DBattleMotion {
  if (game.winner !== null) return fighter.side === game.winner ? "win" : "lose";
  switch (fighter.state) {
    case "active":
      return "attack";
    case "lunge":
      return "special_fire";
    case "stagger":
      return "hit";
    case "stance":
      return "special_charge";
    case "windup":
      return fighter.move === "grab" || fighter.special ? "special_charge" : "idle";
    default:
      return "idle";
  }
}
