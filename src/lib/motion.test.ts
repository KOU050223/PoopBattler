import { describe, expect, it, vi } from "vitest";

import {
  STRAIN_ACCELERATION_THRESHOLD,
  STRAIN_DEBOUNCE_MS,
  STRAIN_ROTATION_THRESHOLD,
  accelerationMagnitude,
  createStrainListener,
  inspectMotionPermission,
  motionSkipReason,
  orientationDeltaDegrees,
  pickAcceleration,
  requestMotionPermission,
  rotationRateMagnitude,
  shouldFireStrain,
  shouldFireStrainSample,
  strainAccelerationMagnitude,
  type DeviceMotionEventLike,
  type DeviceOrientationEventLike,
  type StrainListenerHost,
} from "./motion";

function axis(x: number, y: number, z: number) {
  return { x, y, z };
}

function rate(alpha: number, beta: number, gamma: number) {
  return { alpha, beta, gamma };
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
        DeviceOrientationEvent: { requestPermission: async () => "granted" },
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
    expect(
      inspectMotionPermission({
        isSecureContext: true,
        DeviceOrientationEvent: {},
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

  it("モーションが拒否でも向きが許可なら granted にする", async () => {
    await expect(
      requestMotionPermission({
        isSecureContext: true,
        DeviceMotionEvent: { requestPermission: async () => "denied" },
        DeviceOrientationEvent: { requestPermission: async () => "granted" },
      }),
    ).resolves.toBe("granted");
  });

  it("向きだけの端末でも許可と拒否を区別する", async () => {
    await expect(
      requestMotionPermission({
        isSecureContext: true,
        DeviceOrientationEvent: { requestPermission: async () => "granted" },
      }),
    ).resolves.toBe("granted");

    await expect(
      requestMotionPermission({
        isSecureContext: true,
        DeviceOrientationEvent: { requestPermission: async () => "denied" },
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
    expect(rotationRateMagnitude({ alpha: 3, beta: 4, gamma: null })).toBeNull();
    expect(rotationRateMagnitude(rate(0, 80, 0))).toBe(80);

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

  it("静止の重力は踏ん張りにせず、ジャイロの急な回転は撃つ", () => {
    expect(
      strainAccelerationMagnitude({
        acceleration: axis(0, 0, 0.2),
        accelerationIncludingGravity: axis(0, 9.8, 0),
      }),
    ).toBeLessThan(STRAIN_ACCELERATION_THRESHOLD);

    expect(
      strainAccelerationMagnitude({
        acceleration: null,
        accelerationIncludingGravity: axis(0, 0, 9.80665),
      }),
    ).toBeCloseTo(0);

    expect(
      shouldFireStrainSample({
        acceleration: 0.2,
        rotation: STRAIN_ROTATION_THRESHOLD,
        now: 1_000,
        lastFireAt: null,
      }),
    ).toBe(true);
    expect(
      shouldFireStrainSample({
        acceleration: 0.2,
        rotation: STRAIN_ROTATION_THRESHOLD - 1,
        now: 1_000,
        lastFireAt: null,
      }),
    ).toBe(false);
  });

  it("向きの最短差分は 180 度をまたいでも小さい側を取る", () => {
    expect(
      orientationDeltaDegrees(
        { alpha: 350, beta: 0, gamma: 0 },
        { alpha: 10, beta: 0, gamma: 0 },
      ),
    ).toBeCloseTo(20);
    expect(
      orientationDeltaDegrees({ alpha: 0, beta: 0, gamma: 0 }, { alpha: 10, beta: 0, gamma: null }),
    ).toBeNull();
  });
});

describe("createStrainListener", () => {
  function createHost() {
    const listeners = new Map<string, EventListener>();
    const host: StrainListenerHost = {
      addEventListener(type, next) {
        if (typeof next === "function") {
          listeners.set(type, next);
        }
      },
      removeEventListener(type) {
        listeners.delete(type);
      },
    };
    return {
      host,
      emitMotion(event: DeviceMotionEventLike) {
        listeners.get("devicemotion")?.(event as Event);
      },
      emitOrientation(event: DeviceOrientationEventLike) {
        listeners.get("deviceorientation")?.(event as Event);
      },
      isAttached() {
        return listeners.has("devicemotion") || listeners.has("deviceorientation");
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
    rotationRate: rate(0, 0, 0),
  };
  const gyroSpike: DeviceMotionEventLike = {
    acceleration: axis(0, 0, 0.2),
    accelerationIncludingGravity: axis(0, 9.8, 0),
    rotationRate: rate(0, STRAIN_ROTATION_THRESHOLD, 0),
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

    host.emitMotion(spike);
    expect(onStrain).not.toHaveBeenCalled();

    strain.start();
    host.emitMotion(rest);
    expect(onStrain).not.toHaveBeenCalled();

    now = 10;
    host.emitMotion(spike);
    now = 20;
    host.emitMotion(spike);
    expect(onStrain).toHaveBeenCalledTimes(1);
    expect(host.isAttached()).toBe(false);
  });

  it("加速度が弱くてもジャイロの急回転で発射する", () => {
    const host = createHost();
    const onStrain = vi.fn();
    const strain = createStrainListener({ host: host.host, onStrain });

    strain.start();
    host.emitMotion(rest);
    expect(onStrain).not.toHaveBeenCalled();

    host.emitMotion(gyroSpike);
    expect(onStrain).toHaveBeenCalledTimes(1);
    expect(host.isAttached()).toBe(false);
  });

  it("rotationRate が無いときは向きの急変を角速度として使う", () => {
    const host = createHost();
    const onStrain = vi.fn();
    let now = 0;
    const strain = createStrainListener({
      host: host.host,
      onStrain,
      now: () => now,
    });

    strain.start();
    host.emitOrientation({ alpha: 0, beta: 0, gamma: 0 });
    now = 100;
    host.emitOrientation({ alpha: 0, beta: 4, gamma: 0 });
    expect(onStrain).not.toHaveBeenCalled();

    now = 16;
    host.emitOrientation({ alpha: 0, beta: 2, gamma: 0 });
    expect(onStrain).not.toHaveBeenCalled();

    now = 200;
    host.emitOrientation({ alpha: 0, beta: 20, gamma: 0 });
    expect(onStrain).toHaveBeenCalledTimes(1);
  });

  it("stop と準備終了後はイベントを購読しない", () => {
    const host = createHost();
    const onStrain = vi.fn();
    const strain = createStrainListener({ host: host.host, onStrain });

    strain.start();
    strain.stop();
    host.emitMotion(spike);
    expect(onStrain).not.toHaveBeenCalled();
    expect(host.isAttached()).toBe(false);

    strain.stop();
  });
});
