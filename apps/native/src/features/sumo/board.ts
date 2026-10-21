import { CFG } from "./config";
import type { Fighter, Game } from "./types";

export const opponentOf = (g: Game, f: Fighter): Fighter => g.f[1 - f.side];
export const isAtEdge = (g: Game, f: Fighter): boolean => (f.side === 0 ? g.target <= -CFG.EDGE : g.target >= CFG.EDGE);
