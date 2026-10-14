import { describe, expect, it } from "vitest";

import { MEAL_PHOTO_MAX_SIZE_BYTES, validateMealPhoto } from "./meal-photo-storage";

describe("validateMealPhoto", () => {
  it("JPEG・PNG・WebPで5MB以下の画像を受け入れる", () => {
    expect(validateMealPhoto(new File(["photo"], "meal.webp", { type: "image/webp" }))).toBeUndefined();
  });

  it("未対応形式とサイズ超過の画像を拒否する", () => {
    expect(validateMealPhoto(new File(["photo"], "meal.gif", { type: "image/gif" }))).toBe("JPEG、PNG、WebPの画像を選択してください。");
    expect(validateMealPhoto(new File([new Uint8Array(MEAL_PHOTO_MAX_SIZE_BYTES + 1)], "meal.jpg", { type: "image/jpeg" }))).toBe("画像は5MB以下にしてください。");
  });
});
