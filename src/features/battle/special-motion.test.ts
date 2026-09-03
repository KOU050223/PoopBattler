import { describe, expect, it } from "vitest";

import { planSpecialMotion } from "./special-motion";

describe("planSpecialMotion", () => {
  it("準備に入れなければ何もしない", () => {
    expect(
      planSpecialMotion({ permission: "granted", enteredSpecial: false }),
    ).toBe("noop");
    expect(
      planSpecialMotion({ permission: "denied", enteredSpecial: false }),
    ).toBe("noop");
  });

  it("許可時だけ準備中の揺れ・傾きを待ち、拒否と未対応は即発射する", () => {
    expect(
      planSpecialMotion({ permission: "granted", enteredSpecial: true }),
    ).toBe("listen");
    expect(
      planSpecialMotion({ permission: "denied", enteredSpecial: true }),
    ).toBe("fire-now");
    expect(
      planSpecialMotion({ permission: "unsupported", enteredSpecial: true }),
    ).toBe("fire-now");
    expect(
      planSpecialMotion({ permission: "prompt", enteredSpecial: true }),
    ).toBe("noop");
  });
});
