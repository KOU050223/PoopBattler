export type ScreenWakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
};

export type ScreenWakeLock = {
  request: (type: "screen") => Promise<ScreenWakeLockSentinel>;
};

export function getScreenWakeLock(
  target: { wakeLock?: ScreenWakeLock } | undefined = typeof navigator ===
    "undefined"
    ? undefined
    : navigator,
): ScreenWakeLock | undefined {
  return target?.wakeLock;
}

export async function requestScreenWakeLock(
  wakeLock: ScreenWakeLock | undefined = getScreenWakeLock(),
): Promise<ScreenWakeLockSentinel | null> {
  if (typeof wakeLock?.request !== "function") {
    return null;
  }

  try {
    return await wakeLock.request("screen");
  } catch {
    return null;
  }
}

export async function releaseScreenWakeLock(
  sentinel: ScreenWakeLockSentinel | null,
): Promise<void> {
  if (!sentinel || sentinel.released) {
    return;
  }

  try {
    await sentinel.release();
  } catch {
    // 非対応・既に解放済みは無視する。
  }
}
