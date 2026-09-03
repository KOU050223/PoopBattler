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
export const STRAIN_DEBOUNCE_MS = 400;
const LINEAR_ACCEL_MIN = 1;

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

export function createStrainListener(options: {
  host: StrainListenerHost;
  onStrain: () => void;
  now?: () => number;
  threshold?: number;
  debounceMs?: number;
}): { start: () => void; stop: () => void; isListening: () => boolean } {
  const now = options.now ?? Date.now;
  let lastFireAt: number | null = null;
  let listening = false;

  function handle(event: DeviceMotionEventLike) {
    if (!listening) {
      return;
    }

    const magnitude = accelerationMagnitude(pickAcceleration(event));
    const at = now();
    if (
      !shouldFireStrain({
        magnitude,
        now: at,
        lastFireAt,
        threshold: options.threshold,
        debounceMs: options.debounceMs,
      })
    ) {
      return;
    }

    lastFireAt = at;
    listening = false;
    options.host.removeEventListener("devicemotion", handle);
    options.onStrain();
  }

  return {
    start() {
      if (listening) {
        return;
      }
      lastFireAt = null;
      listening = true;
      options.host.addEventListener("devicemotion", handle);
    },
    stop() {
      if (!listening) {
        return;
      }
      listening = false;
      options.host.removeEventListener("devicemotion", handle);
    },
    isListening() {
      return listening;
    },
  };
}
