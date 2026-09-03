import { describe, expect, it, vi } from "vitest";

import {
  STRAIN_ACCELERATION_THRESHOLD,
  STRAIN_IDLE_DECAY_RATE,
  STRAIN_REQUIRED_MS,
  accelerationMagnitude,
  advanceStrainAccumulation,
  createStrainListener,
  inspectMotionPermission,
  isStraining,
  motionSkipReason,
  pickAcceleration,
  requestMotionPermission,
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
  it("欠損やしきい値未満は踏ん張らず、しきい値以上だけ踏ん張る", () => {
    expect(accelerationMagnitude({ x: 3, y: 4, z: null })).toBeNull();
    expect(accelerationMagnitude(axis(3, 4, 12))).toBe(13);

    expect(isStraining(STRAIN_ACCELERATION_THRESHOLD - 0.1)).toBe(false);
    expect(isStraining(STRAIN_ACCELERATION_THRESHOLD)).toBe(true);
    expect(isStraining(null)).toBe(false);
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

  it("静止の重力では踏ん張らない", () => {
    expect(isStraining(accelerationMagnitude(axis(0, 9.8, 0)))).toBe(false);
  });
});

describe("advanceStrainAccumulation", () => {
  it("静止は積まず、短いスパイクでも発射しない", () => {
    expect(
      advanceStrainAccumulation({
        accumulatedMs: 0,
        dtMs: 50,
        straining: false,
      }),
    ).toEqual({ accumulatedMs: 0, fired: false });

    expect(
      advanceStrainAccumulation({
        accumulatedMs: 0,
        dtMs: 50,
        straining: true,
      }),
    ).toEqual({ accumulatedMs: 50, fired: false });
  });

  it("しきい値以上の揺れを約10秒続けると発射する", () => {
    const finished = advanceStrainAccumulation({
      accumulatedMs: STRAIN_REQUIRED_MS - 50,
      dtMs: 50,
      straining: true,
    });
    expect(finished).toEqual({ accumulatedMs: STRAIN_REQUIRED_MS, fired: true });

    const short = advanceStrainAccumulation({
      accumulatedMs: STRAIN_REQUIRED_MS - 80,
      dtMs: 50,
      straining: true,
    });
    expect(short.fired).toBe(false);
    expect(short.accumulatedMs).toBe(STRAIN_REQUIRED_MS - 30);
  });

  it("途切れると進捗が落ち、すぐには発射しない", () => {
    const afterIdle = advanceStrainAccumulation({
      accumulatedMs: 5_000,
      dtMs: 1_000,
      straining: false,
    });
    expect(afterIdle.fired).toBe(false);
    expect(afterIdle.accumulatedMs).toBe(5_000 - 1_000 * STRAIN_IDLE_DECAY_RATE);

    const spikeAfterIdle = advanceStrainAccumulation({
      accumulatedMs: afterIdle.accumulatedMs,
      dtMs: 50,
      straining: true,
    });
    expect(spikeAfterIdle.fired).toBe(false);
    expect(spikeAfterIdle.accumulatedMs).toBeLessThan(STRAIN_REQUIRED_MS);
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
  const SAMPLE_MS = 50;

  function emitUntil(host: ReturnType<typeof createHost>, event: DeviceMotionEventLike, clock: { now: number }, until: number) {
    while (clock.now < until) {
      clock.now += SAMPLE_MS;
      host.emit(event);
    }
  }

  it("静止・短いスパイクでは撃たず、約10秒続けると撃ち、途切れ後はすぐ撃たない", () => {
    const host = createHost();
    const onStrain = vi.fn();
    const onProgress = vi.fn();
    const clock = { now: 0 };
    const strain = createStrainListener({
      host: host.host,
      onStrain,
      onProgress,
      now: () => clock.now,
    });

    host.emit(spike);
    expect(onStrain).not.toHaveBeenCalled();

    strain.start();
    emitUntil(host, rest, clock, 10_000);
    expect(onStrain).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalled();
    expect(onProgress.mock.calls.at(-1)?.[0].ratio).toBe(0);

    clock.now = 0;
    strain.stop();
    strain.start();
    clock.now = SAMPLE_MS;
    host.emit(spike);
    expect(onStrain).not.toHaveBeenCalled();
    expect(onProgress.mock.calls.at(-1)?.[0].ratio).toBeLessThan(1);

    clock.now = 0;
    strain.stop();
    strain.start();
    emitUntil(host, spike, clock, STRAIN_REQUIRED_MS);
    expect(onStrain).toHaveBeenCalledTimes(1);
    expect(host.isAttached()).toBe(false);

    const interrupted = createHost();
    const interruptedStrain = vi.fn();
    const interruptedClock = { now: 0 };
    const listener = createStrainListener({
      host: interrupted.host,
      onStrain: interruptedStrain,
      now: () => interruptedClock.now,
    });
    listener.start();
    emitUntil(interrupted, spike, interruptedClock, 5_000);
    emitUntil(interrupted, rest, interruptedClock, 6_000);
    interruptedClock.now += SAMPLE_MS;
    interrupted.emit(spike);
    expect(interruptedStrain).not.toHaveBeenCalled();
    expect(interrupted.isAttached()).toBe(true);
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
