import { describe, expect, it, vi } from "vitest";

import {
  STRAIN_ACCELERATION_THRESHOLD,
  STRAIN_DEBOUNCE_MS,
  accelerationMagnitude,
  createStrainListener,
  inspectMotionPermission,
  motionSkipReason,
  pickAcceleration,
  requestMotionPermission,
  shouldFireStrain,
  type DeviceMotionEventLike,
  type StrainListenerHost,
} from "./motion";

function axis(x: number, y: number, z: number) {
  return { x, y, z };
}

describe("inspectMotionPermission", () => {
  it("HTTPS 外と未対応は unsupported になる", () => {
    expect(
      inspectMotionPermission({ isSecureContext: false, DeviceMotionEvent: {} }),
    ).toBe("unsupported");
    expect(
      inspectMotionPermission({ isSecureContext: true, canSubscribe: true }),
    ).toBe("unsupported");
  });

  it("requestPermission がある端末は prompt、購読できるだけなら granted", () => {
    expect(
      inspectMotionPermission({
        isSecureContext: true,
        DeviceMotionEvent: { requestPermission: async () => "granted" },
        canSubscribe: true,
      }),
    ).toBe("prompt");
    expect(
      inspectMotionPermission({
        isSecureContext: true,
        DeviceMotionEvent: {},
        canSubscribe: true,
      }),
    ).toBe("granted");
  });

  it("コンストラクタがあっても購読できないときは unsupported になる", () => {
    expect(
      inspectMotionPermission({
        isSecureContext: true,
        DeviceMotionEvent: {},
        canSubscribe: false,
      }),
    ).toBe("unsupported");
  });
});

describe("requestMotionPermission", () => {
  it("prompt 以外はそのまま返し、許可と拒否を区別する", async () => {
    await expect(
      requestMotionPermission({ isSecureContext: false, DeviceMotionEvent: {} }),
    ).resolves.toBe("unsupported");

    await expect(
      requestMotionPermission({
        isSecureContext: true,
        DeviceMotionEvent: { requestPermission: async () => "granted" },
      }),
    ).resolves.toBe("granted");

    await expect(
      requestMotionPermission({
        isSecureContext: true,
        DeviceMotionEvent: { requestPermission: async () => "denied" },
      }),
    ).resolves.toBe("denied");
  });

  it("requestPermission の例外は denied にする", async () => {
    await expect(
      requestMotionPermission({
        isSecureContext: true,
        DeviceMotionEvent: {
          requestPermission: async () => {
            throw new Error("not allowed");
          },
        },
      }),
    ).resolves.toBe("denied");
  });
});

describe("motionSkipReason", () => {
  it("発射を省略する理由だけ返し、許可と未確認は出さない", () => {
    const insecure = { isSecureContext: false, DeviceMotionEvent: {} };
    const secure = { isSecureContext: true, DeviceMotionEvent: {} };

    expect(motionSkipReason("granted", secure)).toBeNull();
    expect(motionSkipReason("prompt", secure)).toBeNull();
    expect(motionSkipReason("denied", secure)).toContain("拒否");
    expect(motionSkipReason("unsupported", insecure)).toContain("HTTPS");
    expect(motionSkipReason("unsupported", secure)).toContain("この端末");
  });
});

describe("揺れ判定", () => {
  it("欠損やしきい値未満は撃たず、しきい値以上だけ撃つ", () => {
    expect(accelerationMagnitude({ x: 3, y: 4, z: null })).toBeNull();
    expect(accelerationMagnitude(axis(3, 4, 12))).toBe(13);

    expect(
      shouldFireStrain({
        magnitude: STRAIN_ACCELERATION_THRESHOLD - 0.1,
        now: 1_000,
        lastFireAt: null,
      }),
    ).toBe(false);
    expect(
      shouldFireStrain({
        magnitude: STRAIN_ACCELERATION_THRESHOLD,
        now: 1_000,
        lastFireAt: null,
      }),
    ).toBe(true);
  });

  it("デバウンス中の2回目は撃たない", () => {
    expect(
      shouldFireStrain({
        magnitude: 20,
        now: 1_000,
        lastFireAt: 1_000 - STRAIN_DEBOUNCE_MS + 1,
      }),
    ).toBe(false);
    expect(
      shouldFireStrain({
        magnitude: 20,
        now: 1_000,
        lastFireAt: 1_000 - STRAIN_DEBOUNCE_MS,
      }),
    ).toBe(true);
  });

  it("線形加速度がほぼゼロなら重力込みを使う", () => {
    expect(
      pickAcceleration({
        acceleration: axis(0, 0, 0),
        accelerationIncludingGravity: axis(0, 0, 12),
      }),
    ).toEqual(axis(0, 0, 12));
    expect(
      pickAcceleration({
        acceleration: axis(0, 0, 8),
        accelerationIncludingGravity: axis(0, 0, 20),
      }),
    ).toEqual(axis(0, 0, 8));
  });
});

describe("createStrainListener", () => {
  function createHost() {
    let listener: ((event: DeviceMotionEventLike) => void) | null = null;
    const host: StrainListenerHost = {
      addEventListener(_type, next) {
        listener = next;
      },
      removeEventListener() {
        listener = null;
      },
    };
    return {
      host,
      emit(event: DeviceMotionEventLike) {
        listener?.(event);
      },
      isAttached() {
        return listener != null;
      },
    };
  }

  const spike: DeviceMotionEventLike = {
    acceleration: axis(0, 0, 20),
    accelerationIncludingGravity: axis(0, 0, 20),
  };
  const rest: DeviceMotionEventLike = {
    acceleration: axis(0, 0, 0.2),
    accelerationIncludingGravity: axis(0, 9.8, 0),
  };

  it("準備中の1回の踏ん張りだけ発射し、弱い揺れでは撃たない", () => {
    const host = createHost();
    const onStrain = vi.fn();
    let now = 0;
    const strain = createStrainListener({
      host: host.host,
      onStrain,
      now: () => now,
    });

    host.emit(spike);
    expect(onStrain).not.toHaveBeenCalled();

    strain.start();
    host.emit(rest);
    expect(onStrain).not.toHaveBeenCalled();

    now = 10;
    host.emit(spike);
    now = 20;
    host.emit(spike);
    expect(onStrain).toHaveBeenCalledTimes(1);
    expect(host.isAttached()).toBe(false);
  });

  it("stop と準備終了後はイベントを購読しない", () => {
    const host = createHost();
    const onStrain = vi.fn();
    const strain = createStrainListener({ host: host.host, onStrain });

    strain.start();
    strain.stop();
    host.emit(spike);
    expect(onStrain).not.toHaveBeenCalled();
    expect(host.isAttached()).toBe(false);

    strain.stop();
  });
});
