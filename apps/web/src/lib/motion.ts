export type MotionPermission = "unsupported" | "prompt" | "granted" | "denied";

export type MotionAxis = {
  x: number | null;
  y: number | null;
  z: number | null;
};

export type DeviceMotionEventLike = {
  acceleration: MotionAxis | null;
  accelerationIncludingGravity: MotionAxis | null;
};

export type DeviceMotionEventCtor = {
  requestPermission?: () => Promise<PermissionState | "granted" | "denied">;
};

export type MotionEnvironment = {
  isSecureContext: boolean;
  DeviceMotionEvent?: DeviceMotionEventCtor;
  canSubscribe?: boolean;
};

export type StrainListenerHost = {
  addEventListener: (
    type: "devicemotion",
    listener: (event: DeviceMotionEventLike) => void,
  ) => void;
  removeEventListener: (
    type: "devicemotion",
    listener: (event: DeviceMotionEventLike) => void,
  ) => void;
};

export const STRAIN_ACCELERATION_THRESHOLD = 12;
export const STRAIN_REQUIRED_MS = 3_000;
export const STRAIN_IDLE_DECAY_RATE = 2;
export const STRAIN_MAX_SAMPLE_DT_MS = 80;
const LINEAR_ACCEL_MIN = 1;

export type StrainProgress = {
  accumulatedMs: number;
  requiredMs: number;
  ratio: number;
};

export function readBrowserMotionEnv(): MotionEnvironment {
  if (typeof window === "undefined") {
    return { isSecureContext: false, canSubscribe: false };
  }

  return {
    isSecureContext: window.isSecureContext,
    DeviceMotionEvent: window.DeviceMotionEvent as DeviceMotionEventCtor | undefined,
    canSubscribe: typeof window.addEventListener === "function",
  };
}

export function inspectMotionPermission(env: MotionEnvironment): MotionPermission {
  if (!env.isSecureContext || env.DeviceMotionEvent == null) {
    return "unsupported";
  }

  if (typeof env.DeviceMotionEvent.requestPermission === "function") {
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

export async function requestMotionPermission(
  env: MotionEnvironment,
): Promise<MotionPermission> {
  const inspected = inspectMotionPermission(env);
  if (inspected !== "prompt") {
    return inspected;
  }

  const request = env.DeviceMotionEvent?.requestPermission;
  if (typeof request !== "function") {
    return "unsupported";
  }

  try {
    const result = await request.call(env.DeviceMotionEvent);
    if (result === "granted") {
      return "granted";
    }
    return "denied";
  } catch {
    return "denied";
  }
}

export function accelerationMagnitude(axis: MotionAxis | null | undefined): number | null {
  if (axis == null || axis.x == null || axis.y == null || axis.z == null) {
    return null;
  }

  return Math.hypot(axis.x, axis.y, axis.z);
}

export function pickAcceleration(event: DeviceMotionEventLike): MotionAxis | null {
  const linearMagnitude = accelerationMagnitude(event.acceleration);
  if (linearMagnitude != null && linearMagnitude >= LINEAR_ACCEL_MIN) {
    return event.acceleration;
  }

  return event.accelerationIncludingGravity;
}

export function isStraining(
  magnitude: number | null,
  threshold: number = STRAIN_ACCELERATION_THRESHOLD,
): boolean {
  return magnitude != null && magnitude >= threshold;
}

export function advanceStrainAccumulation(input: {
  accumulatedMs: number;
  dtMs: number;
  straining: boolean;
  requiredMs?: number;
  decayRate?: number;
  maxSampleDtMs?: number;
}): { accumulatedMs: number; fired: boolean } {
  const requiredMs = input.requiredMs ?? STRAIN_REQUIRED_MS;
  const decayRate = input.decayRate ?? STRAIN_IDLE_DECAY_RATE;
  const maxSampleDtMs = input.maxSampleDtMs ?? STRAIN_MAX_SAMPLE_DT_MS;
  const rawDt = Math.max(0, input.dtMs);
  const idleDt = Math.max(0, rawDt - maxSampleDtMs);
  const sampleDt = Math.min(rawDt, maxSampleDtMs);

  let accumulatedMs = input.accumulatedMs;
  if (idleDt > 0) {
    accumulatedMs = Math.max(0, accumulatedMs - idleDt * decayRate);
  }
  accumulatedMs = input.straining
    ? accumulatedMs + sampleDt
    : Math.max(0, accumulatedMs - sampleDt * decayRate);

  if (accumulatedMs >= requiredMs) {
    return { accumulatedMs: requiredMs, fired: true };
  }

  return { accumulatedMs, fired: false };
}

function strainProgressOf(accumulatedMs: number, requiredMs: number): StrainProgress {
  return {
    accumulatedMs,
    requiredMs,
    ratio: requiredMs <= 0 ? 0 : Math.min(1, accumulatedMs / requiredMs),
  };
}

export function createStrainListener(options: {
  host: StrainListenerHost;
  onStrain: () => void;
  onProgress?: (progress: StrainProgress) => void;
  now?: () => number;
  threshold?: number;
  requiredMs?: number;
  decayRate?: number;
}): { start: () => void; stop: () => void; isListening: () => boolean } {
  const now = options.now ?? Date.now;
  const requiredMs = options.requiredMs ?? STRAIN_REQUIRED_MS;
  let accumulatedMs = 0;
  let lastSampleAt: number | null = null;
  let listening = false;

  function report() {
    options.onProgress?.(strainProgressOf(accumulatedMs, requiredMs));
  }

  function handle(event: DeviceMotionEventLike) {
    if (!listening) {
      return;
    }

    const at = now();
    const dtMs = lastSampleAt == null ? 0 : at - lastSampleAt;
    lastSampleAt = at;

    const next = advanceStrainAccumulation({
      accumulatedMs,
      dtMs,
      straining: isStraining(
        accelerationMagnitude(pickAcceleration(event)),
        options.threshold,
      ),
      requiredMs,
      decayRate: options.decayRate,
    });
    accumulatedMs = next.accumulatedMs;
    report();

    if (!next.fired) {
      return;
    }

    listening = false;
    options.host.removeEventListener("devicemotion", handle);
    options.onStrain();
  }

  return {
    start() {
      if (listening) {
        return;
      }
      accumulatedMs = 0;
      lastSampleAt = now();
      listening = true;
      report();
      options.host.addEventListener("devicemotion", handle);
    },
    stop() {
      if (!listening) {
        return;
      }
      listening = false;
      accumulatedMs = 0;
      lastSampleAt = null;
      options.host.removeEventListener("devicemotion", handle);
      report();
    },
    isListening() {
      return listening;
    },
  };
}
