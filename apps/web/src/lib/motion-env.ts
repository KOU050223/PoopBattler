import type { DeviceMotionEventCtor, MotionEnvironment } from "@poopbattler/domain/motion/device-motion";

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
