import { describe, expect, it } from "vitest";
import { SPECIES } from "../config";
import { appearanceOfSpecies } from "./appearance";

describe("appearanceOfSpecies", () => {
  it("全力士に見た目が割り当たり、3人の体色は互いに違う", () => {
    const colors = SPECIES.map((species) => appearanceOfSpecies(species.id).color);
    expect(new Set(colors).size).toBe(SPECIES.length);
  });

  it("未知の力士は標準の見た目になる", () => {
    expect(appearanceOfSpecies("unknown").head).toBe("none");
  });
});
