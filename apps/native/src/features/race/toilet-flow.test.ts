import { describe, expect, it } from "vitest";

import { IDLE_PHASE, reduceToiletFlow, type ToiletFlowAction, type ToiletFlowPhase } from "./toilet-flow";
import type { RaceResultView } from "./ui/race-screen-result";

const result = { title: "1着", subtitle: "", playerPlace: 1, rows: [], zoneGrades: [], highlights: [] } satisfies RaceResultView;
const run = (actions: ToiletFlowAction[], from: ToiletFlowPhase = IDLE_PHASE) => actions.reduce(reduceToiletFlow, from);

describe("reduceToiletFlow", () => {
  it("開始するとレースになる", () => {
    expect(run([{ type: "start", battleId: "b1" }])).toEqual({ phase: "race", battleId: "b1" });
  });

  it("レースが終わると結果になり、記録へ進める", () => {
    const state = run([{ type: "start", battleId: "b1" }, { type: "raceOver", result }, { type: "toRecord" }]);

    expect(state).toEqual({ phase: "record", battleId: "b1" });
  });

  it("開始前でもレース中でも、遊ばずに記録へ進める", () => {
    expect(run([{ type: "skip", battleId: "b1" }])).toEqual({ phase: "record", battleId: "b1" });
    expect(run([{ type: "start", battleId: "b1" }, { type: "skip", battleId: "b1" }])).toEqual({ phase: "record", battleId: "b1" });
  });

  it("結果から二度目のレースを始められない", () => {
    const state = run([{ type: "start", battleId: "b1" }, { type: "raceOver", result }]);

    expect(reduceToiletFlow(state, { type: "start", battleId: "b2" })).toBe(state);
  });

  it("記録に進んだらレースにも結果にも戻れない", () => {
    const state = run([{ type: "skip", battleId: "b1" }]);

    expect(reduceToiletFlow(state, { type: "start", battleId: "b2" })).toBe(state);
    expect(reduceToiletFlow(state, { type: "raceOver", result })).toBe(state);
  });

  it("レース中の二重開始は無視する", () => {
    const state = run([{ type: "start", battleId: "b1" }]);

    expect(reduceToiletFlow(state, { type: "start", battleId: "b2" })).toBe(state);
  });
});
