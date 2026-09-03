import { describe, expect, it, vi } from "vitest";

import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
  type ScreenWakeLockSentinel,
} from "./wake-lock";

describe("requestScreenWakeLock", () => {
  it("非対応と拒否は null を返し、成功時だけ sentinel を返す", async () => {
    await expect(requestScreenWakeLock(undefined)).resolves.toBeNull();

    await expect(
      requestScreenWakeLock({
        request: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      }),
    ).resolves.toBeNull();

    const sentinel: ScreenWakeLockSentinel = {
      released: false,
      release: vi.fn(async () => {}),
    };
    await expect(
      requestScreenWakeLock({ request: async () => sentinel }),
    ).resolves.toBe(sentinel);
  });
});

describe("releaseScreenWakeLock", () => {
  it("未取得と解放済みは何もしない", async () => {
    await releaseScreenWakeLock(null);
    const released: ScreenWakeLockSentinel = {
      released: true,
      release: vi.fn(async () => {}),
    };
    await releaseScreenWakeLock(released);
    expect(released.release).not.toHaveBeenCalled();
  });

  it("取得中なら release を呼ぶ", async () => {
    const sentinel: ScreenWakeLockSentinel = {
      released: false,
      release: vi.fn(async () => {
        sentinel.released = true;
      }),
    };
    await releaseScreenWakeLock(sentinel);
    expect(sentinel.release).toHaveBeenCalledOnce();
  });
});
