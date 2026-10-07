import { describe, expect, it, vi } from "vitest";

import { MEAL_PHOTO_MAX_SIZE_BYTES, MealPhotoError, storePickedPhoto } from "./meal-photo";

const ID = "11111111-1111-4111-8111-111111111111";

describe("storePickedPhoto", () => {
  it("読み込んだ画像を新しいIDで保存してIDを返す", async () => {
    const put = vi.fn(async () => {});
    const id = await storePickedPhoto("file:///a.jpg", { readBytes: async () => new Uint8Array([1, 2]), store: { put }, newId: () => ID });
    expect(id).toBe(ID);
    expect(put).toHaveBeenCalledWith(ID, expect.any(ArrayBuffer));
  });

  it("5MB超は保存せず too_large", async () => {
    const put = vi.fn();
    await expect(storePickedPhoto("u", { readBytes: async () => new Uint8Array(MEAL_PHOTO_MAX_SIZE_BYTES + 1), store: { put }, newId: () => ID }))
      .rejects.toMatchObject({ code: "too_large" });
    expect(put).not.toHaveBeenCalled();
  });

  it("読込・保存の失敗は save_failed に写す", async () => {
    const fail = async () => { throw new Error("io"); };
    const a = storePickedPhoto("u", { readBytes: fail, store: { put: vi.fn() }, newId: () => ID });
    await expect(a).rejects.toBeInstanceOf(MealPhotoError);
    await expect(storePickedPhoto("u", { readBytes: async () => new Uint8Array(1), store: { put: fail }, newId: () => ID }))
      .rejects.toMatchObject({ code: "save_failed" });
  });
});
