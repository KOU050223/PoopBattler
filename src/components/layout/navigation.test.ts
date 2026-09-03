import { describe, expect, it } from "vitest";

import { navigationItems } from "./navigation";

describe("navigationItems", () => {
  it("フッターにバトル・記録・図鑑は出すが、食事は出さない", () => {
    const hrefs = navigationItems.map((item) => item.href);

    expect(hrefs).toEqual(["/battle", "/logs", "/collection"]);
    expect(hrefs).not.toContain("/meals");
  });
});
