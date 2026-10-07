import { describe, expect, it } from "vitest";

import {
  inspectUserMediaStart,
  isStaleUserMediaRequest,
  userMediaCameraErrorStatus,
} from "./user-media-camera";

describe("inspectUserMediaStart", () => {
  it("HTTPS かつ getUserMedia があるときだけ開始できる", () => {
    expect(
      inspectUserMediaStart({ isSecureContext: true, hasGetUserMedia: true }),
    ).toBe("ok");
  });

  it("HTTP や API 欠如では開始せず、成否を取り違えない", () => {
    expect(
      inspectUserMediaStart({ isSecureContext: false, hasGetUserMedia: true }),
    ).toBe("insecure");
    expect(
      inspectUserMediaStart({ isSecureContext: true, hasGetUserMedia: false }),
    ).toBe("unsupported");
  });
});

describe("userMediaCameraErrorStatus", () => {
  it("拒否と非対応を error に潰さない", () => {
    expect(userMediaCameraErrorStatus(new DOMException("no", "NotAllowedError"))).toBe("denied");
    expect(userMediaCameraErrorStatus(new DOMException("busy", "NotReadableError"))).toBe("busy");
    expect(userMediaCameraErrorStatus(new DOMException("gone", "NotFoundError"))).toBe("unavailable");
  });

  it("未知の失敗だけ error にする", () => {
    expect(userMediaCameraErrorStatus(new Error("boom"))).toBe("error");
  });
});

describe("isStaleUserMediaRequest", () => {
  it("画面離脱後のストリームは古い要求として止める", () => {
    expect(isStaleUserMediaRequest(1, 2)).toBe(true);
    expect(isStaleUserMediaRequest(3, 3)).toBe(false);
  });
});
