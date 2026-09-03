export type MotionPermission = "unsupported" | "prompt" | "granted" | "denied";

export type MotionAxis = {
  x: number | null;
  y: number | null;
  z: number | null;
};

export type RotationRate = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
};

export type DeviceMotionEventLike = {
  acceleration: MotionAxis | null;
  accelerationIncludingGravity: MotionAxis | null;
  rotationRate?: RotationRate | null;
};

export type DeviceOrientationEventLike = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
};

export type DeviceMotionEventCtor = {
  requestPermission?: () => Promise<PermissionState | "granted" | "denied">;
};

export type MotionEnvironment = {
  isSecureContext: boolean;
  DeviceMotionEvent?: DeviceMotionEventCtor;
  DeviceOrientationEvent?: DeviceMotionEventCtor;
  canSubscribe?: boolean;
};

export type StrainListenerHost = {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
};

export const STRAIN_ACCELERATION_THRESHOLD = 3.5;
export const STRAIN_ROTATION_THRESHOLD = 80;
export const STRAIN_ORIENTATION_DELTA_MIN = 12;
export const STRAIN_DEBOUNCE_MS = 400;
const LINEAR_ACCEL_MIN = 1;
const STANDARD_GRAVITY = 9.80665;

export function readBrowserMotionEnv(): MotionEnvironment {
  if (typeof window === "undefined") {
    return { isSecureContext: false, canSubscribe: false };
  }

  return {
    isSecureContext: window.isSecureContext,
    DeviceMotionEvent: window.DeviceMotionEvent as DeviceMotionEventCtor | undefined,
    DeviceOrientationEvent: window.DeviceOrientationEvent as DeviceMotionEventCtor | undefined,
    canSubscribe: typeof window.addEventListener === "function",
  };
}

function hasSensorConstructor(env: MotionEnvironment): boolean {
  return env.DeviceMotionEvent != null || env.DeviceOrientationEvent != null;
}

function needsPermissionPrompt(env: MotionEnvironment): boolean {
  return (
    typeof env.DeviceMotionEvent?.requestPermission === "function" ||
    typeof env.DeviceOrientationEvent?.requestPermission === "function"
  );
}

export function inspectMotionPermission(env: MotionEnvironment): MotionPermission {
  if (!env.isSecureContext || !hasSensorConstructor(env)) {
    return "unsupported";
  }

  if (needsPermissionPrompt(env)) {
    return "prompt";
  }

  if (env.canSubscribe === false) {
    return "unsupported";
  }

  return "granted";
}

export function motionSkipReason(
  permission: MotionPermission,
  env: MotionEnvironment,
): string | null {
  if (permission === "granted" || permission === "prompt") {
    return null;
  }

  if (!env.isSecureContext) {
    return "HTTPS の外では揺れを使えないため、準備を省略して発射します。";
  }

  if (permission === "denied") {
    return "揺れの利用が拒否されたため、準備を省略して発射します。";
  }

  return "この端末では揺れを使えないため、準備を省略して発射します。";
}

async function requestCtorPermission(
  ctor: DeviceMotionEventCtor | undefined,
): Promise<MotionPermission | "skip"> {
  const request = ctor?.requestPermission;
  if (typeof request !== "function") {
    return "skip";
  }

  try {
    const result = await request.call(ctor);
    if (result === "granted") {
      return "granted";
    }
    return "denied";
  } catch {
    return "denied";
  }
}

export async function requestMotionPermission(
  env: MotionEnvironment,
): Promise<MotionPermission> {
  const inspected = inspectMotionPermission(env);
  if (inspected !== "prompt") {
    return inspected;
  }

  const motion = await requestCtorPermission(env.DeviceMotionEvent);
  if (motion === "granted") {
    return "granted";
  }

  const orientation = await requestCtorPermission(env.DeviceOrientationEvent);
  if (orientation === "granted") {
    return "granted";
  }

  if (motion === "denied" || orientation === "denied") {
    return "denied";
  }

  return "unsupported";
}

export function accelerationMagnitude(axis: MotionAxis | null | undefined): number | null {
  if (axis == null || axis.x == null || axis.y == null || axis.z == null) {
    return null;
  }

  return Math.hypot(axis.x, axis.y, axis.z);
}

export function rotationRateMagnitude(rate: RotationRate | null | undefined): number | null {
  if (rate == null || rate.alpha == null || rate.beta == null || rate.gamma == null) {
    return null;
  }

  return Math.hypot(rate.alpha, rate.beta, rate.gamma);
}

export function pickAcceleration(event: DeviceMotionEventLike): MotionAxis | null {
  const linearMagnitude = accelerationMagnitude(event.acceleration);
  if (linearMagnitude != null && linearMagnitude >= LINEAR_ACCEL_MIN) {
    return event.acceleration;
  }

  return event.accelerationIncludingGravity;
}

export function strainAccelerationMagnitude(event: DeviceMotionEventLike): number | null {
  const linear = accelerationMagnitude(event.acceleration);
  if (linear != null && linear >= LINEAR_ACCEL_MIN) {
    return linear;
  }

  const withGravity = accelerationMagnitude(event.accelerationIncludingGravity);
  if (withGravity != null) {
    return Math.abs(withGravity - STANDARD_GRAVITY);
  }

  return linear;
}

export function orientationDeltaDegrees(
  previous: DeviceOrientationEventLike | null,
  next: DeviceOrientationEventLike,
): number | null {
  if (previous == null) {
    return null;
  }

  const deltas: number[] = [];
  for (const key of ["alpha", "beta", "gamma"] as const) {
    const from = previous[key];
    const to = next[key];
    if (from == null || to == null) {
      return null;
    }
    deltas.push(shortestAngleDelta(from, to));
  }

  return Math.hypot(deltas[0]!, deltas[1]!, deltas[2]!);
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = (to - from) % 360;
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  return delta;
}

export function shouldFireStrain(input: {
  magnitude: number | null;
  now: number;
  lastFireAt: number | null;
  threshold?: number;
  debounceMs?: number;
}): boolean {
  const threshold = input.threshold ?? STRAIN_ACCELERATION_THRESHOLD;
  const debounceMs = input.debounceMs ?? STRAIN_DEBOUNCE_MS;

  if (input.magnitude == null || input.magnitude < threshold) {
    return false;
  }

  if (input.lastFireAt != null && input.now - input.lastFireAt < debounceMs) {
    return false;
  }

  return true;
}

export function shouldFireStrainSample(input: {
  acceleration: number | null;
  rotation: number | null;
  now: number;
  lastFireAt: number | null;
  accelerationThreshold?: number;
  rotationThreshold?: number;
  debounceMs?: number;
}): boolean {
  const shared = {
    now: input.now,
    lastFireAt: input.lastFireAt,
    debounceMs: input.debounceMs,
  };

  return (
    shouldFireStrain({
      ...shared,
      magnitude: input.acceleration,
      threshold: input.accelerationThreshold ?? STRAIN_ACCELERATION_THRESHOLD,
    }) ||
    shouldFireStrain({
      ...shared,
      magnitude: input.rotation,
      threshold: input.rotationThreshold ?? STRAIN_ROTATION_THRESHOLD,
    })
  );
}

export function createStrainListener(options: {
  host: StrainListenerHost;
  onStrain: () => void;
  now?: () => number;
  threshold?: number;
  rotationThreshold?: number;
  debounceMs?: number;
}): { start: () => void; stop: () => void; isListening: () => boolean } {
  const now = options.now ?? Date.now;
  let lastFireAt: number | null = null;
  let listening = false;
  let previousOrientation: DeviceOrientationEventLike | null = null;
  let lastOrientationAt: number | null = null;

  function fire(at: number) {
    lastFireAt = at;
    listening = false;
    previousOrientation = null;
    lastOrientationAt = null;
    options.host.removeEventListener("devicemotion", handleMotion);
    options.host.removeEventListener("deviceorientation", handleOrientation);
    options.onStrain();
  }

  function tryFire(sample: {
    acceleration: number | null;
    rotation: number | null;
    at: number;
  }) {
    if (!listening) {
      return;
    }

    if (
      !shouldFireStrainSample({
        acceleration: sample.acceleration,
        rotation: sample.rotation,
        now: sample.at,
        lastFireAt,
        accelerationThreshold: options.threshold,
        rotationThreshold: options.rotationThreshold,
        debounceMs: options.debounceMs,
      })
    ) {
      return;
    }

    fire(sample.at);
  }

  const handleMotion: EventListener = (event) => {
    const motion = event as DeviceMotionEventLike;
    tryFire({
      acceleration: strainAccelerationMagnitude(motion),
      rotation: rotationRateMagnitude(motion.rotationRate),
      at: now(),
    });
  };

  const handleOrientation: EventListener = (event) => {
    const orientation = event as DeviceOrientationEventLike;
    const at = now();
    const delta = orientationDeltaDegrees(previousOrientation, orientation);
    previousOrientation = orientation;

    let rotationFromOrientation: number | null = null;
    if (
      delta != null &&
      delta >= STRAIN_ORIENTATION_DELTA_MIN &&
      lastOrientationAt != null
    ) {
      const elapsedSeconds = (at - lastOrientationAt) / 1000;
      if (elapsedSeconds > 0) {
        rotationFromOrientation = delta / elapsedSeconds;
      }
    }
    lastOrientationAt = at;

    tryFire({
      acceleration: null,
      rotation: rotationFromOrientation,
      at,
    });
  };

  return {
    start() {
      if (listening) {
        return;
      }
      lastFireAt = null;
      previousOrientation = null;
      lastOrientationAt = null;
      listening = true;
      options.host.addEventListener("devicemotion", handleMotion);
      options.host.addEventListener("deviceorientation", handleOrientation);
    },
    stop() {
      if (!listening) {
        return;
      }
      listening = false;
      previousOrientation = null;
      lastOrientationAt = null;
      options.host.removeEventListener("devicemotion", handleMotion);
      options.host.removeEventListener("deviceorientation", handleOrientation);
    },
    isListening() {
      return listening;
    },
  };
}
